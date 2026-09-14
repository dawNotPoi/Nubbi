import { RefreshCw } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import {
  fetchCodexModels,
  fetchProviderModels,
  getCodexAccount,
  getModelConfig,
  logoutCodex,
  saveModelConfig,
  startCodexLogin,
} from "../../api";
import { Button, Field, IconButton } from "../../components/controls";
import { colors } from "../../theme";
import type { CodexAccount, DeviceLogin, ModelConfig } from "../../types";
import { ModelProviderFields } from "./model-provider-fields";
import { Notice } from "./notice";
import { settingsStyles as styles } from "./styles";
const emptyModel = (): ModelConfig => ({
  provider: "openai-compatible",
  authType: "api-key",
  baseUrl: "",
  model: "",
  systemPrompt: "",
  apiKeyConfigured: false,
});

export const ModelPanel = ({ baseUrl, token }: { baseUrl: string; token: string }) => {
  const [config, setConfig] = useState(emptyModel);
  const [apiKey, setApiKey] = useState("");
  const [clearApiKey, setClearApiKey] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [account, setAccount] = useState<CodexAccount | null>(null);
  const [login, setLogin] = useState<DeviceLogin | null>(null);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");
  const [danger, setDanger] = useState(false);
  const report = (caught: unknown, fallback: string): void => {
    setDanger(true);
    setMessage(caught instanceof Error ? caught.message : fallback);
  };
  // 刷新 Codex 登录态与模型列表；已登录返回 true。
  const refreshCodex = useCallback(async (): Promise<boolean> => {
    const nextAccount = await getCodexAccount(baseUrl, token);
    setAccount(nextAccount);
    if (nextAccount.account?.type !== "chatgpt") return false;
    const result = await fetchCodexModels(baseUrl, token);
    const values = result.models.map((item) => item.model || item.id);
    setModels(values);
    setConfig((current) => ({
      ...current,
      model: values.includes(current.model) ? current.model : values[0] || "",
    }));
    setLogin(null);
    return true;
  }, [baseUrl, token]);
  useEffect(() => {
    setBusy(true);
    void getModelConfig(baseUrl, token)
      .then((value) => {
        setConfig(value);
        if (value.provider === "codex-subscription") return refreshCodex();
        return undefined;
      })
      .catch((caught: unknown) => report(caught, "加载模型配置失败"))
      .finally(() => setBusy(false));
  }, [baseUrl, refreshCodex, token]);
  // 登录流程启动后轮询登录结果，直到 Codex 返回已登录。
  useEffect(() => {
    if (!login) return;
    const timer = setInterval(() => {
      void refreshCodex().then((done) => {
        if (done) {
          setDanger(false);
          setMessage("ChatGPT 登录成功");
        }
      }).catch(() => undefined);
    }, 2_500);
    return () => clearInterval(timer);
  }, [login, refreshCodex]);
  const loadModels = async (): Promise<void> => {
    setBusy(true);
    setMessage("");
    try {
      if (config.provider === "codex-subscription") {
        if (!await refreshCodex()) throw new Error("请先登录 ChatGPT");
      } else {
        if (!config.baseUrl.trim()) throw new Error("请先填写 Base URL");
        const result = await fetchProviderModels(baseUrl, token, {
          baseUrl: config.baseUrl.trim(),
          apiKey: apiKey.trim() || undefined,
        });
        setModels(result.models);
        if (!config.model && result.models[0]) setConfig({ ...config, model: result.models[0] });
      }
      setDanger(false);
      setMessage("模型列表已更新");
    } catch (caught) {
      report(caught, "获取模型失败");
    } finally {
      setBusy(false);
    }
  };
  const beginLogin = async (): Promise<void> => {
    setBusy(true);
    try {
      const result = await startCodexLogin(baseUrl, token);
      setLogin(result);
      await Linking.openURL(result.verificationUrl);
      setDanger(false);
      setMessage(`浏览器已打开，请输入代码 ${result.userCode}`);
    } catch (caught) {
      report(caught, "无法开始登录");
    } finally {
      setBusy(false);
    }
  };
  const signOut = async (): Promise<void> => {
    setBusy(true);
    try {
      await logoutCodex(baseUrl, token);
      setAccount({ account: null, requiresOpenaiAuth: true });
      setModels([]);
      setMessage("已退出 ChatGPT");
      setDanger(false);
    } catch (caught) {
      report(caught, "退出登录失败");
    } finally {
      setBusy(false);
    }
  };
  // 保存配置时：订阅模式固定为 ChatGPT 登录，API 模式固定为 api-key。
  const save = async (): Promise<void> => {
    setBusy(true);
    try {
      const saved = await saveModelConfig(baseUrl, token, {
        provider: config.provider,
        authType: config.provider === "codex-subscription" ? "chatgpt" : "api-key",
        baseUrl: config.baseUrl.trim(),
        model: config.model.trim(),
        systemPrompt: config.systemPrompt,
        apiKey: apiKey.trim() || undefined,
        clearApiKey,
      });
      setConfig(saved);
      setApiKey("");
      setClearApiKey(false);
      setDanger(false);
      setMessage("模型配置已保存");
    } catch (caught) {
      report(caught, "保存失败");
    } finally {
      setBusy(false);
    }
  };
  const changeProvider = (provider: ModelConfig["provider"]): void => {
  setModels([]);
  setConfig({ ...config, provider, authType: provider === "codex-subscription" ? "chatgpt" : "api-key" });
    if (provider === "codex-subscription") void refreshCodex().catch((caught) => report(caught, "Codex 不可用"));
  };
  return (
    <View style={styles.panel}>
      <View style={styles.tabs}>
        <Pressable onPress={() => changeProvider("openai-compatible")} style={[styles.tab, config.provider === "openai-compatible" && styles.tabActive]}>
          <Text style={[styles.tabText, config.provider === "openai-compatible" && styles.tabTextActive]}>API Key</Text>
        </Pressable>
        <Pressable onPress={() => changeProvider("codex-subscription")} style={[styles.tab, config.provider === "codex-subscription" && styles.tabActive]}>
          <Text style={[styles.tabText, config.provider === "codex-subscription" && styles.tabTextActive]}>ChatGPT 订阅</Text>
        </Pressable>
      </View>

      <ModelProviderFields
        account={account}
        apiKey={apiKey}
        busy={busy}
        clearApiKey={clearApiKey}
        config={config}
        login={login}
        onLogin={() => void beginLogin()}
        onLogout={() => void signOut()}
        setApiKey={setApiKey}
        setClearApiKey={setClearApiKey}
        setConfig={setConfig}
      />
      <View style={styles.modelLabelRow}>
        <Text style={styles.fieldLabel}>模型</Text>
        <IconButton disabled={busy} icon={<RefreshCw color={colors.primary} size={19} />} label="获取模型" onPress={() => void loadModels()} />
      </View>
      <Field label="模型 ID" onChangeText={(model) => setConfig({ ...config, model })} value={config.model} />
      {models.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modelList}>
          {models.map((model) => (
            <Pressable key={model} onPress={() => setConfig({ ...config, model })} style={[styles.modelChip, config.model === model && styles.modelChipActive]}>
              <Text style={[styles.modelChipText, config.model === model && styles.modelChipTextActive]}>{model}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      <Field label="系统提示词" multiline onChangeText={(systemPrompt) => setConfig({ ...config, systemPrompt })} value={config.systemPrompt} />
      <Notice danger={danger} message={message} />
      <Button loading={busy} onPress={() => void save()}>保存模型配置</Button>
    </View>
  );
};

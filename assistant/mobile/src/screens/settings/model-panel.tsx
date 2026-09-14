import { Plus, RefreshCw, Trash2 } from "lucide-react-native";
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
/**
 * 生成默认模型配置。
 * @returns 全空的模型配置对象。
 */
const emptyModel = (): ModelConfig => ({
  provider: "openai-compatible",
  authType: "api-key",
  baseUrl: "",
  model: "",
  systemPrompt: "",
  headers: {},
  apiKeyConfigured: false,
});

/** 模型请求头的表单草稿：以键值对数组承载，便于增删。 */
type ModelHeader = { key: string; value: string };

/** 服务端配置 → 请求头草稿数组。
 * @param headers 服务端保存的请求头对象。
 * @returns 可编辑的键值对数组。
 */
const toHeaderPairs = (headers: Record<string, string>): ModelHeader[] =>
  Object.entries(headers).map(([key, value]) => ({ key, value }));

/** 请求头草稿数组 → 服务端配置；过滤空 key。
 * @param pairs 表单中的请求头键值对数组。
 * @returns 过滤后的请求头对象。
 */
const fromHeaderPairs = (pairs: ModelHeader[]): Record<string, string> =>
  Object.fromEntries(pairs
    .map((item) => [item.key.trim(), item.value])
    .filter(([key]) => Boolean(key)));

/**
 * 模型设置面板：API Key / ChatGPT 订阅切换、模型拉取与配置保存。
 * @param props.baseUrl Assistant API 基础地址。
 * @param props.token 配置管理密钥。
 * @returns 模型设置面板视图。
 */
export const ModelPanel = ({ baseUrl, token }: { baseUrl: string; token: string }) => {
  const [config, setConfig] = useState(emptyModel);
  const [apiKey, setApiKey] = useState("");
  const [clearApiKey, setClearApiKey] = useState(false);
  const [headerPairs, setHeaderPairs] = useState<ModelHeader[]>([]);
  const [temperature, setTemperature] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [account, setAccount] = useState<CodexAccount | null>(null);
  const [login, setLogin] = useState<DeviceLogin | null>(null);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");
  const [danger, setDanger] = useState(false);
  /**
   * 统一错误提示：写入 danger 状态与消息文案。
   * @param caught 捕获的异常。
   * @param fallback 无法提取消息时的兜底文案。
   * @returns 无返回值。
   */
  const report = (caught: unknown, fallback: string): void => {
    setDanger(true);
    setMessage(caught instanceof Error ? caught.message : fallback);
  };
  /**
   * 刷新 Codex 登录态与模型列表；已登录返回 true。
   * @returns 是否已登录 ChatGPT。
   */
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
        setHeaderPairs(toHeaderPairs(value.headers));
        setTemperature(value.temperature == null ? "" : String(value.temperature));
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
  /**
   * 拉取并展示 Provider 可用模型列表。
   * @returns 拉取完成后的 Promise。
   */
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
          headers: fromHeaderPairs(headerPairs),
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
  /**
   * 发起 Codex 设备码登录并在浏览器打开验证页。
   * @returns 登录流程完成后的 Promise。
   */
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
  /**
   * 退出 ChatGPT 登录并清空模型列表。
   * @returns 退出完成后的 Promise。
   */
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
  /**
   * 保存模型配置；订阅模式固定为 ChatGPT 登录，API 模式固定为 api-key。
   * @returns 保存完成后的 Promise。
   */
  const save = async (): Promise<void> => {
    setBusy(true);
    try {
      const temperatureValue =
        temperature.trim() === "" ? undefined : Number(temperature);
      const saved = await saveModelConfig(baseUrl, token, {
        provider: config.provider,
        authType: config.provider === "codex-subscription" ? "chatgpt" : "api-key",
        baseUrl: config.baseUrl.trim(),
        model: config.model.trim(),
        systemPrompt: config.systemPrompt,
        headers: fromHeaderPairs(headerPairs),
        temperature:
          temperatureValue === undefined || Number.isNaN(temperatureValue)
            ? undefined
            : temperatureValue,
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
  /**
   * 切换 Provider 并重置模型列表；切到订阅模式时刷新 Codex。
   * @param provider 目标 Provider 类型。
   * @returns 无返回值。
   */
  const changeProvider = (provider: ModelConfig["provider"]): void => {
  setModels([]);
  setConfig({ ...config, provider, authType: provider === "codex-subscription" ? "chatgpt" : "api-key" });
    if (provider === "codex-subscription") void refreshCodex().catch((caught) => report(caught, "Codex 不可用"));
  };
  /**
   * 更新指定索引请求头的字段。
   * @param index 请求头在数组中的索引。
   * @param patch 要合并的字段更新。
   * @returns 无返回值。
   */
  const updateHeader = (index: number, patch: Partial<ModelHeader>): void => {
    setHeaderPairs((items) => items.map((item, candidate) =>
      candidate === index ? { ...item, ...patch } : item));
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
      {config.provider === "openai-compatible" ? (
        <>
          <Field
            keyboardType="decimal-pad"
            label="采样温度"
            onChangeText={setTemperature}
            placeholder="默认 0.3，范围 0~2"
            value={temperature}
          />
          <Text style={styles.fieldLabel}>自定义请求头</Text>
          {headerPairs.map((header, index) => (
            <View key={index} style={styles.headerEditor}>
              <View style={styles.headerFields}>
                <Field label="名称" onChangeText={(key) => updateHeader(index, { key })} value={header.key} />
                <Field autoCapitalize="none" autoCorrect={false} label="值" onChangeText={(value) => updateHeader(index, { value })} placeholder="Bearer token 或 ${ENV_NAME}" value={header.value} />
              </View>
              <IconButton icon={<Trash2 color={colors.danger} size={18} />} label="删除请求头" onPress={() => setHeaderPairs((items) => items.filter((_, candidate) => candidate !== index))} />
            </View>
          ))}
          <IconButton icon={<Plus color={colors.primary} size={20} />} label="添加请求头" onPress={() => setHeaderPairs((items) => [...items, { key: "", value: "" }])} />
        </>
      ) : null}
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

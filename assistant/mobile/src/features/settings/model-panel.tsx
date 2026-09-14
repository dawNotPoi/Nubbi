import { useModelSettings } from "./use-model-settings.ts";
import { Plus, RefreshCw, Trash2 } from "lucide-react-native";

import { Pressable, ScrollView, Text, View } from "react-native";

import { Button, Field, IconButton } from "../../components/controls.tsx";
import { colors } from "../../theme.ts";

import { ModelProviderFields } from "./model-provider-fields.tsx";
import { Notice } from "./notice.tsx";
import { settingsStyles as styles } from "./styles.ts";
/**
 * 模型设置面板：API Key / ChatGPT 订阅切换、模型拉取与配置保存。
 * @param props.baseUrl Assistant API 基础地址。
 * @param props.configAccessToken 配置管理密钥。
 * @returns 模型设置面板视图。
 */
export const ModelPanel = ({
  baseUrl,
  configAccessToken,
}: {
  baseUrl: string;
  configAccessToken: string;
}): React.JSX.Element => {
  const {
    config,
    setConfig,
    apiKey,
    setApiKey,
    clearApiKey,
    setClearApiKey,
    headerPairs,
    setHeaderPairs,
    temperature,
    setTemperature,
    models,
    account,
    login,
    busy,
    message,
    danger,
    beginLogin,
    signOut,
    loadModels,
    save,
    changeProvider,
    updateHeader,
  } = useModelSettings(baseUrl, configAccessToken);

  return (
    <View style={styles.panel}>
      <View style={styles.tabs}>
        <Pressable
          onPress={() => changeProvider("openai-compatible")}
          style={[styles.tab, config.provider === "openai-compatible" && styles.tabActive]}
        >
          <Text style={[styles.tabText, config.provider === "openai-compatible" && styles.tabTextActive]}>API Key</Text>
        </Pressable>
        <Pressable
          onPress={() => changeProvider("codex-subscription")}
          style={[styles.tab, config.provider === "codex-subscription" && styles.tabActive]}
        >
          <Text style={[styles.tabText, config.provider === "codex-subscription" && styles.tabTextActive]}>
            ChatGPT 订阅
          </Text>
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
                <Field
                  autoCapitalize="none"
                  autoCorrect={false}
                  label="值"
                  onChangeText={(value) => updateHeader(index, { value })}
                  placeholder="Bearer token 或 ${ENV_NAME}"
                  value={header.value}
                />
              </View>
              <IconButton
                icon={<Trash2 color={colors.danger} size={18} />}
                label="删除请求头"
                onPress={() => setHeaderPairs((items) => items.filter((_, candidate) => candidate !== index))}
              />
            </View>
          ))}
          <IconButton
            icon={<Plus color={colors.primary} size={20} />}
            label="添加请求头"
            onPress={() => setHeaderPairs((items) => [...items, { key: "", value: "" }])}
          />
        </>
      ) : null}
      <View style={styles.modelLabelRow}>
        <Text style={styles.fieldLabel}>模型</Text>
        <IconButton
          disabled={busy}
          icon={<RefreshCw color={colors.primary} size={19} />}
          label="获取模型"
          onPress={() => void loadModels()}
        />
      </View>
      <Field label="模型 ID" onChangeText={(model) => setConfig({ ...config, model })} value={config.model} />
      {models.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modelList}>
          {models.map((model) => (
            <Pressable
              key={model}
              onPress={() => setConfig({ ...config, model })}
              style={[styles.modelChip, config.model === model && styles.modelChipActive]}
            >
              <Text style={[styles.modelChipText, config.model === model && styles.modelChipTextActive]}>{model}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      <Field
        label="系统提示词"
        multiline
        onChangeText={(systemPrompt) => setConfig({ ...config, systemPrompt })}
        value={config.systemPrompt}
      />
      <Notice danger={danger} message={message} />
      <Button loading={busy} onPress={() => void save()}>
        保存模型配置
      </Button>
    </View>
  );
};

import { Text, View } from "react-native";
import { Button, Checkbox, Field } from "../../components/controls.tsx";
import type { CodexAccount, DeviceLogin, ModelConfig } from "../../types.ts";
import { settingsStyles as styles } from "./styles.ts";

/**
 * 按当前 Provider 渲染对应的登录/密钥字段：API Key 或 ChatGPT 订阅。
 * @param props.config 当前模型配置。
 * @param props.setConfig 更新配置的回调。
 * @param props.apiKey 输入的 API Key 值。
 * @param props.setApiKey 更新 API Key 输入的回调。
 * @param props.clearApiKey 是否清除服务端已保存的 Key。
 * @param props.setClearApiKey 更新清除标记的回调。
 * @param props.account Codex 账号信息。
 * @param props.login 设备码登录信息。
 * @param props.busy 是否处于加载中。
 * @param props.onLogin 发起登录的回调。
 * @param props.onLogout 退出登录的回调。
 * @returns Provider 对应的登录/密钥字段视图。
 */
export const ModelProviderFields = ({
  config,
  setConfig,
  apiKey,
  setApiKey,
  clearApiKey,
  setClearApiKey,
  account,
  login,
  busy,
  onLogin,
  onLogout,
}: {
  config: ModelConfig;
  setConfig: (config: ModelConfig) => void;
  apiKey: string;
  setApiKey: (value: string) => void;
  clearApiKey: boolean;
  setClearApiKey: (value: boolean) => void;
  account: CodexAccount | null;
  login: DeviceLogin | null;
  busy: boolean;
  onLogin: () => void;
  onLogout: () => void;
}): React.JSX.Element => {
  if (config.provider === "openai-compatible") {
    return (
      <>
        <Field
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          label="Base URL"
          onChangeText={(baseUrl) => setConfig({ ...config, baseUrl })}
          placeholder="https://api.example.com/v1"
          value={config.baseUrl}
        />
        <Field
          autoCapitalize="none"
          autoCorrect={false}
          editable={!clearApiKey}
          label="API Key"
          onChangeText={setApiKey}
          placeholder={config.apiKeyConfigured ? "已保存，留空保持不变" : "sk-..."}
          secureTextEntry
          value={apiKey}
        />
        {config.apiKeyConfigured ? (
          <Checkbox label="清除服务端已保存的 API Key" onValueChange={setClearApiKey} value={clearApiKey} />
        ) : null}
      </>
    );
  }

  const signedIn = account?.account?.type === "chatgpt";
  return (
    <View style={styles.providerRow}>
      <Text style={styles.itemTitle}>{signedIn ? account.account?.email || "ChatGPT 已登录" : "尚未登录 ChatGPT"}</Text>
      <Text selectable style={styles.itemSubtitle}>
        {login
          ? `设备代码：${login.userCode}`
          : signedIn
            ? `订阅：${account.account?.planType || "可用"}`
            : "凭据只保存在 Assistant API 所在设备"}
      </Text>
      <Button loading={busy} onPress={signedIn ? onLogout : onLogin} tone="secondary">
        {signedIn ? "退出登录" : "登录 ChatGPT"}
      </Button>
    </View>
  );
};

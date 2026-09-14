import { Text, View } from "react-native";
import { Button, Checkbox, Field } from "../../components/controls";
import type { CodexAccount, DeviceLogin, ModelConfig } from "../../types";
import { settingsStyles as styles } from "./styles";

/** 按当前 Provider 渲染对应的登录/密钥字段：API Key 或 ChatGPT 订阅。 */
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
}) => {
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
          <Checkbox
            label="清除服务端已保存的 API Key"
            onValueChange={setClearApiKey}
            value={clearApiKey}
          />
        ) : null}
      </>
    );
  }

  const signedIn = account?.account?.type === "chatgpt";
  return (
    <View style={styles.providerRow}>
      <Text style={styles.itemTitle}>
        {signedIn ? account.account?.email || "ChatGPT 已登录" : "尚未登录 ChatGPT"}
      </Text>
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

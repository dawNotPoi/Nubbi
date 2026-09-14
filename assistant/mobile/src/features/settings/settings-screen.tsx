import { FlaskConical, KeyRound, Server, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getModelConfig } from "../../api.ts";
import { Button, Field, IconButton } from "../../components/controls.tsx";
import { readConfigToken, saveConfigToken } from "../../platform/connection-storage.ts";
import { colors } from "../../theme.ts";
import { McpPanel } from "./mcp-panel.tsx";
import { ModelPanel } from "./model-panel.tsx";
import { Notice } from "./notice.tsx";
import { settingsStyles as styles } from "./styles.ts";

/**
 * 设置页：密钥解锁、模型/MCP 面板切换与服务器地址更换。
 * @param props.baseUrl Assistant API 基础地址。
 * @param props.onClose 关闭设置页的回调。
 * @param props.onChangeServer 更换 API 地址的回调。
 * @returns 设置页视图。
 */
export const SettingsScreen = ({
  baseUrl,
  onClose,
  onChangeServer,
}: {
  baseUrl: string;
  onClose: () => void;
  onChangeServer: () => void;
}): React.JSX.Element => {
  // token 为 null 表示正在读取安全存储；空字符串表示未解锁；非空表示已解锁。
  const [configAccessToken, setToken] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [tab, setTab] = useState<"model" | "mcp">("model");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // 打开时读取本地保存的管理密钥，有则直接进入设置。
  useEffect(() => {
    void readConfigToken().then(setToken);
  }, []);

  /**
   * 用密钥请求一次配置接口完成解锁，成功则持久化到安全存储。
   * @returns 解锁流程完成后的 Promise。
   */
  const unlock = async (): Promise<void> => {
    const value = tokenInput.trim();
    if (!value) return;
    setBusy(true);
    setError("");
    try {
      await getModelConfig(baseUrl, value);
      await saveConfigToken(value);
      setToken(value);
      setTokenInput("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "解锁失败");
    } finally {
      setBusy(false);
    }
  };

  /**
   * 锁定设置：清除本地密钥并回到解锁页。
   * @returns 锁定完成后的 Promise。
   */
  const lock = async (): Promise<void> => {
    await saveConfigToken("");
    setToken("");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>设置</Text>
          {configAccessToken ? (
            <IconButton
              icon={<KeyRound color={colors.text} size={20} />}
              label="锁定设置"
              onPress={() => void lock()}
            />
          ) : null}
          <IconButton icon={<X color={colors.text} size={22} />} label="关闭" onPress={onClose} />
        </View>
        {configAccessToken === null ? (
          <View style={styles.center}>
            <Text style={styles.itemSubtitle}>正在读取安全配置</Text>
          </View>
        ) : !configAccessToken ? (
          <View style={styles.unlock}>
            <View style={styles.unlockIcon}>
              <KeyRound color={colors.primary} size={26} />
            </View>
            <Field
              autoCapitalize="none"
              autoCorrect={false}
              label="设置管理密钥"
              onChangeText={setTokenInput}
              secureTextEntry
              value={tokenInput}
            />
            <Notice danger message={error} />
            <Button disabled={!tokenInput.trim()} loading={busy} onPress={() => void unlock()}>
              解锁配置
            </Button>
            <Button onPress={onChangeServer} tone="secondary">
              更换 Assistant API
            </Button>
          </View>
        ) : (
          <>
            <View style={styles.tabs}>
              {(["model", "mcp"] as const).map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setTab(item)}
                  style={[styles.tab, tab === item && styles.tabActive]}
                >
                  {item === "model" ? (
                    <Server color={tab === item ? colors.primary : colors.muted} size={17} />
                  ) : (
                    <FlaskConical color={tab === item ? colors.primary : colors.muted} size={17} />
                  )}
                  <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>
                    {item === "model" ? "模型" : "MCP"}
                  </Text>
                </Pressable>
              ))}
            </View>
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
              {tab === "model" ? (
                <ModelPanel baseUrl={baseUrl} configAccessToken={configAccessToken} />
              ) : (
                <McpPanel baseUrl={baseUrl} configAccessToken={configAccessToken} />
              )}
              <Button onPress={onChangeServer} tone="secondary">
                更换 Assistant API
              </Button>
            </ScrollView>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

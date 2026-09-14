import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { ChatScreen } from "./src/features/chat/chat-screen.tsx";
import { ConnectionScreen } from "./src/features/connection/connection-screen.tsx";
import { SettingsScreen } from "./src/features/settings/settings-screen.tsx";
import { readApiUrl } from "./src/platform/connection-storage.ts";
import { colors } from "./src/theme.ts";

/**
 * 应用根组件：用安全区域容器包裹整个应用。
 * @returns 应用根视图。
 */
export default function App(): React.JSX.Element {
  // 安全区域容器包裹整个应用，避免刘海屏/底部手势区域遮挡内容。
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

/**
 * 应用主体：读取 API 地址，按状态展示加载页、连接页或聊天页。
 * @returns 当前状态对应的主界面视图。
 */
function AppContent() {
  // baseUrl 为 null 表示还在读取本地存储，此时展示加载态。
  const [baseUrl, setBaseUrl] = useState<string | null>(null);
  // 是否在编辑连接地址（首次启动或无地址时进入连接页）。
  const [editingConnection, setEditingConnection] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // 启动时读取上次保存的 API 地址。
  useEffect(() => {
    void readApiUrl().then(setBaseUrl);
  }, []);

  if (baseUrl === null) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
        <StatusBar style="dark" />
      </SafeAreaView>
    );
  }

  if (!baseUrl || editingConnection) {
    return (
      <>
        <ConnectionScreen
          initialUrl={baseUrl}
          onConnected={(url) => {
            setBaseUrl(url);
            setEditingConnection(false);
          }}
        />
        <StatusBar style="dark" />
      </>
    );
  }

  return (
    <>
      <ChatScreen baseUrl={baseUrl} settingsOpen={settingsOpen} onOpenSettings={() => setSettingsOpen(true)} />
      <Modal animationType="slide" onRequestClose={() => setSettingsOpen(false)} visible={settingsOpen}>
        <SettingsScreen
          baseUrl={baseUrl}
          onChangeServer={() => {
            setSettingsOpen(false);
            setEditingConnection(true);
          }}
          onClose={() => setSettingsOpen(false)}
        />
      </Modal>
      <StatusBar style="dark" />
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
  },
});

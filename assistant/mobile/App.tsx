import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, SafeAreaView, StyleSheet } from "react-native";
import { ChatScreen } from "./src/screens/chat-screen";
import { ConnectionScreen } from "./src/screens/connection-screen";
import { SettingsScreen } from "./src/screens/settings-screen";
import { readApiUrl } from "./src/storage";
import { colors } from "./src/theme";

export default function App() {
  const [baseUrl, setBaseUrl] = useState<string | null>(null);
  const [editingConnection, setEditingConnection] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => { void readApiUrl().then(setBaseUrl); }, []);

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
      <ChatScreen baseUrl={baseUrl} onOpenSettings={() => setSettingsOpen(true)} />
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

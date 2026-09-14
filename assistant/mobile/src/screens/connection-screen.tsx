import { Server, Wifi } from "lucide-react-native";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { testApiConnection } from "../api";
import { Button, Field } from "../components/controls";
import { normalizeApiUrl, saveApiUrl } from "../storage";
import { colors } from "../theme";

export const ConnectionScreen = ({
  initialUrl,
  onConnected,
}: {
  initialUrl: string;
  onConnected: (url: string) => void;
}) => {
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const connect = async (): Promise<void> => {
    setBusy(true);
    setError("");
    try {
      const normalized = normalizeApiUrl(url);
      await testApiConnection(normalized);
      await saveApiUrl(normalized);
      onConnected(normalized);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "连接失败");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <View style={styles.content}>
          <View style={styles.logo}><Server color={colors.primary} size={28} /></View>
          <Text style={styles.title}>连接 Assistant</Text>
          <Field
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            label="Assistant API 地址"
            onChangeText={setUrl}
            placeholder="http://192.168.1.10:8787"
            value={url}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button disabled={!url.trim()} loading={busy} onPress={() => void connect()}>
            连接
          </Button>
          <View style={styles.hintRow}>
            <Wifi color={colors.muted} size={15} />
            <Text style={styles.hint}>手机与 API 主机需处于可互通网络</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  container: { flex: 1, justifyContent: "center", padding: 24 },
  content: { gap: 18 },
  logo: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  title: { color: colors.text, fontSize: 24, fontWeight: "700", textAlign: "center" },
  error: { backgroundColor: colors.dangerSoft, borderRadius: 6, color: colors.danger, padding: 12 },
  hintRow: { alignItems: "center", flexDirection: "row", gap: 7, justifyContent: "center" },
  hint: { color: colors.muted, fontSize: 12 },
});

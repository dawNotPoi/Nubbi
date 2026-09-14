import { McpTransportFields } from "./mcp-transport-fields.tsx";
import { ChevronLeft } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Button, Field, Switch } from "../../components/controls.tsx";
import { colors } from "../../theme.ts";
import type { McpServerConfig } from "../../types.ts";
import { fromMcpDraft, toMcpDraft } from "./mcp-draft.ts";
import type { McpConnectionTest } from "../../types.ts";
import { Notice } from "./notice.tsx";
import { settingsStyles as styles } from "./styles.ts";

/**
 * MCP 服务编辑表单：字段编辑、请求头管理与测试/保存操作。
 * @param props.server 待编辑的服务配置，null 表示新增。
 * @param props.busy 是否处于加载中。
 * @param props.onBack 返回列表页的回调。
 * @param props.onSave 保存回调。
 * @param props.onTest 测试连接回调。
 * @returns MCP 编辑表单视图。
 */
export const McpForm = ({
  server,
  busy,
  onBack,
  onSave,
  onTest,
}: {
  server: McpServerConfig | null;
  busy: boolean;
  onBack: () => void;
  onSave: (server: McpServerConfig) => Promise<void>;
  onTest: (server: McpServerConfig) => Promise<McpConnectionTest>;
}): React.JSX.Element => {
  const [draft, setDraft] = useState(() => toMcpDraft(server));
  const [message, setMessage] = useState("");
  const [testResult, setTestResult] = useState<McpConnectionTest | null>(null);

  /**
   * 执行保存或测试：先校验草稿，再调用对应回调。
   * @param action 要执行的操作（保存或测试）。
   * @returns 操作完成后的 Promise。
   */
  const run = async (action: "save" | "test"): Promise<void> => {
    try {
      setMessage("");
      const value = fromMcpDraft(draft);
      if (action === "save") await onSave(value);
      else {
        const result = await onTest(value);
        // 旧版服务端可能只返回 toolCount，未返回 tools；这里统一补成数组，避免渲染时崩溃。
        setTestResult({ ...result, tools: result.tools ?? [] });
      }
    } catch (caught) {
      setTestResult(null);
      setMessage(caught instanceof Error ? caught.message : "操作失败");
    }
  };

  return (
    <View style={styles.panel}>
      <Pressable style={styles.backRow} onPress={onBack}>
        <ChevronLeft color={colors.primary} size={19} />
        <Text style={styles.backText}>{server ? "编辑 MCP" : "新增 MCP"}</Text>
      </Pressable>
      <Field label="名称" onChangeText={(name) => setDraft({ ...draft, name })} value={draft.name} />
      {draft.id ? <Field editable={false} label="ID" value={draft.id} /> : null}
      <Text style={styles.fieldLabel}>传输方式</Text>
      <View style={styles.transportRow}>
        <Pressable
          style={[styles.transportButton, draft.transport === "http" && styles.transportButtonActive]}
          onPress={() => setDraft({ ...draft, transport: "http" })}
        >
          <Text style={[styles.transportText, draft.transport === "http" && styles.transportTextActive]}>
            HTTP（远端服务）
          </Text>
        </Pressable>
        <Pressable
          style={[styles.transportButton, draft.transport === "stdio" && styles.transportButtonActive]}
          onPress={() => setDraft({ ...draft, transport: "stdio" })}
        >
          <Text style={[styles.transportText, draft.transport === "stdio" && styles.transportTextActive]}>
            STDIO（本地命令）
          </Text>
        </Pressable>
      </View>
      <McpTransportFields draft={draft} setDraft={setDraft} />
      <View style={styles.switchRow}>
        <Text style={styles.itemTitle}>启用此 Server</Text>
        <Switch onValueChange={(enabled) => setDraft({ ...draft, enabled })} value={draft.enabled} />
      </View>
      {testResult ? (
        <View style={styles.testResultBox}>
          <Text style={styles.testResultTitle}>
            连接成功，发现 {testResult.toolCount ?? testResult.tools?.length ?? 0} 个工具
          </Text>
          {testResult.tools?.map((tool) => (
            <View key={tool.name} style={styles.testResultItem}>
              <Text style={styles.testResultName}>{tool.name}</Text>
              {tool.description ? (
                <Text numberOfLines={2} style={styles.testResultDesc}>
                  {tool.description}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
      <Notice danger message={message} />
      <View style={styles.actionsRow}>
        <View style={styles.flex}>
          <Button loading={busy} onPress={() => void run("test")} tone="secondary">
            测试连接
          </Button>
        </View>
        <View style={styles.flex}>
          <Button loading={busy} onPress={() => void run("save")}>
            保存
          </Button>
        </View>
      </View>
    </View>
  );
};

import { ChevronLeft, Plus, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Button, Field, IconButton, Switch } from "../../components/controls";
import { colors } from "../../theme";
import type { McpServerConfig } from "../../types";
import { fromMcpDraft, toMcpDraft, type HeaderDraft } from "./mcp-draft";
import { Notice } from "./notice";
import { settingsStyles as styles } from "./styles";

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
  onTest: (server: McpServerConfig) => Promise<void>;
}) => {
  const [draft, setDraft] = useState(() => toMcpDraft(server));
  const [message, setMessage] = useState("");

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
      else await onTest(value);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "操作失败");
    }
  };

  /**
   * 更新指定索引请求头的字段。
   * @param index 请求头在草稿数组中的索引。
   * @param patch 要合并的字段更新。
   * @returns 无返回值。
   */
  const updateHeader = (index: number, patch: Partial<HeaderDraft>): void => {
    setDraft({
      ...draft,
      headers: draft.headers.map((item, candidate) => candidate === index ? { ...item, ...patch } : item),
    });
  };

  return (
    <View style={styles.panel}>
      <Pressable style={styles.backRow} onPress={onBack}>
        <ChevronLeft color={colors.primary} size={19} />
        <Text style={styles.backText}>{server ? "编辑 MCP" : "新增 MCP"}</Text>
      </Pressable>
      <Field label="名称" onChangeText={(name) => setDraft({ ...draft, name })} value={draft.name} />
      <Field autoCapitalize="none" autoCorrect={false} editable={!server} label="ID" onChangeText={(id) => setDraft({ ...draft, id: id.toLowerCase() })} value={draft.id} />
      <Field autoCapitalize="none" autoCorrect={false} keyboardType="url" label="MCP HTTP URL" onChangeText={(url) => setDraft({ ...draft, url })} placeholder="https://example.com/mcp" value={draft.url} />
      <View style={styles.headersTitleRow}>
        <Text style={styles.fieldLabel}>请求头</Text>
        <IconButton icon={<Plus color={colors.primary} size={20} />} label="添加请求头" onPress={() => setDraft({ ...draft, headers: [...draft.headers, { key: "", value: "" }] })} />
      </View>
      {draft.headers.map((header, index) => (
        <View key={index} style={styles.headerEditor}>
          <View style={styles.headerFields}>
            <Field label="名称" onChangeText={(key) => updateHeader(index, { key })} value={header.key} />
            <Field autoCapitalize="none" autoCorrect={false} label="值" onChangeText={(value) => updateHeader(index, { value })} placeholder="Bearer token 或 ${ENV_NAME}" value={header.value} />
          </View>
          <IconButton icon={<Trash2 color={colors.danger} size={18} />} label="删除请求头" onPress={() => setDraft({ ...draft, headers: draft.headers.filter((_, candidate) => candidate !== index) })} />
        </View>
      ))}
      <View style={styles.switchRow}>
        <Text style={styles.itemTitle}>启用此 Server</Text>
        <Switch onValueChange={(enabled) => setDraft({ ...draft, enabled })} value={draft.enabled} />
      </View>
      <Notice danger message={message} />
      <View style={styles.actionsRow}>
        <View style={styles.flex}><Button loading={busy} onPress={() => void run("test")} tone="secondary">测试连接</Button></View>
        <View style={styles.flex}><Button loading={busy} onPress={() => void run("save")}>保存</Button></View>
      </View>
    </View>
  );
};

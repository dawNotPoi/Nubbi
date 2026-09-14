import { ChevronLeft, Plus, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Button, Field, IconButton, Switch } from "../../components/controls";
import { colors } from "../../theme";
import type { McpServerConfig } from "../../types";
import { fromMcpDraft, toMcpDraft, type HeaderDraft, type McpDraft } from "./mcp-draft";
import type { McpConnectionTest } from "../../types";
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
  onTest: (server: McpServerConfig) => Promise<McpConnectionTest>;
}) => {
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

  /**
   * 更新指定索引键值对（请求头或环境变量）的字段。
   * @param key 目标字段名（headers 或 env）。
   * @param index 键值对在数组中的索引。
   * @param patch 要合并的字段更新。
   * @returns 无返回值。
   */
  const updatePairs = (key: "headers" | "env", index: number, patch: Partial<HeaderDraft>): void => {
    setDraft({
      ...draft,
      [key]: draft[key].map((item, candidate) => candidate === index ? { ...item, ...patch } : item),
    });
  };

  /**
   * 新增一条键值对（请求头或环境变量）。
   * @param key 目标字段名（headers 或 env）。
   * @returns 无返回值。
   */
  const addPair = (key: "headers" | "env"): void => {
    setDraft({ ...draft, [key]: [...draft[key], { key: "", value: "" }] });
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
          <Text style={[styles.transportText, draft.transport === "http" && styles.transportTextActive]}>HTTP（远端服务）</Text>
        </Pressable>
        <Pressable
          style={[styles.transportButton, draft.transport === "stdio" && styles.transportButtonActive]}
          onPress={() => setDraft({ ...draft, transport: "stdio" })}
        >
          <Text style={[styles.transportText, draft.transport === "stdio" && styles.transportTextActive]}>STDIO（本地命令）</Text>
        </Pressable>
      </View>
      {draft.transport === "http" ? (
        <>
          <Field autoCapitalize="none" autoCorrect={false} keyboardType="url" label="MCP HTTP URL" onChangeText={(url) => setDraft({ ...draft, url })} placeholder="https://example.com/mcp" value={draft.url} />
          <View style={styles.headersTitleRow}>
            <Text style={styles.fieldLabel}>请求头</Text>
            <IconButton icon={<Plus color={colors.primary} size={20} />} label="添加请求头" onPress={() => addPair("headers")} />
          </View>
          {draft.headers.map((header, index) => (
            <View key={index} style={styles.headerEditor}>
              <View style={styles.headerFields}>
                <Field label="名称" onChangeText={(key) => updatePairs("headers", index, { key })} value={header.key} />
                <Field autoCapitalize="none" autoCorrect={false} label="值" onChangeText={(value) => updatePairs("headers", index, { value })} placeholder="Bearer token 或 \${ENV_NAME}" value={header.value} />
              </View>
              <IconButton icon={<Trash2 color={colors.danger} size={18} />} label="删除请求头" onPress={() => setDraft({ ...draft, headers: draft.headers.filter((_, candidate) => candidate !== index) })} />
            </View>
          ))}
        </>
      ) : (
        <>
          <Field autoCapitalize="none" autoCorrect={false} label="启动命令" onChangeText={(command) => setDraft({ ...draft, command })} placeholder="node" value={draft.command ?? ""} />
          <Field autoCapitalize="none" autoCorrect={false} label="启动参数（每行一个）" multiline onChangeText={(argsText) => setDraft({ ...draft, argsText })} placeholder="/path/to/mcp-server/dist/index.js" value={draft.argsText} />
          <Field autoCapitalize="none" autoCorrect={false} label="工作目录（可选）" onChangeText={(cwd) => setDraft({ ...draft, cwd })} placeholder="缺省继承 Assistant 进程目录" value={draft.cwd} />
          <View style={styles.headersTitleRow}>
            <Text style={styles.fieldLabel}>环境变量</Text>
            <IconButton icon={<Plus color={colors.primary} size={20} />} label="添加环境变量" onPress={() => addPair("env")} />
          </View>
          {draft.env.map((item, index) => (
            <View key={index} style={styles.headerEditor}>
              <View style={styles.headerFields}>
                <Field label="名称" onChangeText={(key) => updatePairs("env", index, { key })} value={item.key} />
                <Field autoCapitalize="none" autoCorrect={false} label="值" onChangeText={(value) => updatePairs("env", index, { value })} placeholder="值或 \${ENV_NAME}" value={item.value} />
              </View>
              <IconButton icon={<Trash2 color={colors.danger} size={18} />} label="删除环境变量" onPress={() => setDraft({ ...draft, env: draft.env.filter((_, candidate) => candidate !== index) })} />
            </View>
          ))}
        </>
      )}
      <View style={styles.switchRow}>
        <Text style={styles.itemTitle}>启用此 Server</Text>
        <Switch onValueChange={(enabled) => setDraft({ ...draft, enabled })} value={draft.enabled} />
      </View>
      {testResult ? (
        <View style={styles.testResultBox}>
          <Text style={styles.testResultTitle}>连接成功，发现 {testResult.toolCount ?? testResult.tools?.length ?? 0} 个工具</Text>
          {testResult.tools?.map((tool) => (
            <View key={tool.name} style={styles.testResultItem}>
              <Text style={styles.testResultName}>{tool.name}</Text>
              {tool.description ? (
                <Text numberOfLines={2} style={styles.testResultDesc}>{tool.description}</Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
      <Notice danger message={message} />
      <View style={styles.actionsRow}>
        <View style={styles.flex}><Button loading={busy} onPress={() => void run("test")} tone="secondary">测试连接</Button></View>
        <View style={styles.flex}><Button loading={busy} onPress={() => void run("save")}>保存</Button></View>
      </View>
    </View>
  );
};

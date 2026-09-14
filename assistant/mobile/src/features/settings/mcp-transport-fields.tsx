import { Plus, Trash2 } from "lucide-react-native";

import { Text, View } from "react-native";
import { Field, IconButton } from "../../components/controls.tsx";
import { colors } from "../../theme.ts";

import { type HeaderDraft } from "./mcp-draft.ts";

import { settingsStyles as styles } from "./styles.ts";

import type { Dispatch, SetStateAction } from "react";
import type { McpDraft } from "./mcp-draft.ts";
/**
 * 编辑 HTTP 或 stdio 连接字段。
 * @param props 草稿及其更新函数。
 * @returns 传输字段视图。
 */
export function McpTransportFields({
  draft,
  setDraft,
}: {
  draft: McpDraft;
  setDraft: Dispatch<SetStateAction<McpDraft>>;
}): React.JSX.Element {
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
      [key]: draft[key].map((item, candidate) => (candidate === index ? { ...item, ...patch } : item)),
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
    <>
      {draft.transport === "http" ? (
        <>
          <Field
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            label="MCP HTTP URL"
            onChangeText={(url) => setDraft({ ...draft, url })}
            placeholder="https://example.com/mcp"
            value={draft.url}
          />
          <View style={styles.headersTitleRow}>
            <Text style={styles.fieldLabel}>请求头</Text>
            <IconButton
              icon={<Plus color={colors.primary} size={20} />}
              label="添加请求头"
              onPress={() => addPair("headers")}
            />
          </View>
          {draft.headers.map((header, index) => (
            <View key={index} style={styles.headerEditor}>
              <View style={styles.headerFields}>
                <Field label="名称" onChangeText={(key) => updatePairs("headers", index, { key })} value={header.key} />
                <Field
                  autoCapitalize="none"
                  autoCorrect={false}
                  label="值"
                  onChangeText={(value) => updatePairs("headers", index, { value })}
                  placeholder="Bearer token 或 \${ENV_NAME}"
                  value={header.value}
                />
              </View>
              <IconButton
                icon={<Trash2 color={colors.danger} size={18} />}
                label="删除请求头"
                onPress={() =>
                  setDraft({ ...draft, headers: draft.headers.filter((_, candidate) => candidate !== index) })
                }
              />
            </View>
          ))}
        </>
      ) : (
        <>
          <Field
            autoCapitalize="none"
            autoCorrect={false}
            label="启动命令"
            onChangeText={(command) => setDraft({ ...draft, command })}
            placeholder="node"
            value={draft.command ?? ""}
          />
          <Field
            autoCapitalize="none"
            autoCorrect={false}
            label="启动参数（每行一个）"
            multiline
            onChangeText={(argsText) => setDraft({ ...draft, argsText })}
            placeholder="/path/to/mcp-server/dist/index.js"
            value={draft.argsText}
          />
          <Field
            autoCapitalize="none"
            autoCorrect={false}
            label="工作目录（可选）"
            onChangeText={(cwd) => setDraft({ ...draft, cwd })}
            placeholder="缺省继承 Assistant 进程目录"
            value={draft.cwd}
          />
          <View style={styles.headersTitleRow}>
            <Text style={styles.fieldLabel}>环境变量</Text>
            <IconButton
              icon={<Plus color={colors.primary} size={20} />}
              label="添加环境变量"
              onPress={() => addPair("env")}
            />
          </View>
          {draft.env.map((item, index) => (
            <View key={index} style={styles.headerEditor}>
              <View style={styles.headerFields}>
                <Field label="名称" onChangeText={(key) => updatePairs("env", index, { key })} value={item.key} />
                <Field
                  autoCapitalize="none"
                  autoCorrect={false}
                  label="值"
                  onChangeText={(value) => updatePairs("env", index, { value })}
                  placeholder="值或 \${ENV_NAME}"
                  value={item.value}
                />
              </View>
              <IconButton
                icon={<Trash2 color={colors.danger} size={18} />}
                label="删除环境变量"
                onPress={() => setDraft({ ...draft, env: draft.env.filter((_, candidate) => candidate !== index) })}
              />
            </View>
          ))}
        </>
      )}
    </>
  );
}

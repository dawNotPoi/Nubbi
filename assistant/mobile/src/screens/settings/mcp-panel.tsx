import { FlaskConical, Pencil, Trash2 } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import { createMcpServer, deleteMcpServer, listMcpServers, testMcpServer, updateMcpServer } from "../../api";
import { Button, IconButton, Switch } from "../../components/controls";
import { colors } from "../../theme";
import type { McpServerConfig } from "../../types";
import { McpForm } from "./mcp-form";
import { Notice } from "./notice";
import { settingsStyles as styles } from "./styles";

/**
 * MCP 服务管理面板：列表、新增/编辑表单、启停与删除。
 * @param props.baseUrl Assistant API 基础地址。
 * @param props.token 配置管理密钥。
 * @returns MCP 管理面板视图。
 */
export const McpPanel = ({ baseUrl, token }: { baseUrl: string; token: string }) => {
  const [servers, setServers] = useState<McpServerConfig[]>([]);
  // undefined 为列表页，null 为新增，对象为编辑。
  const [editing, setEditing] = useState<McpServerConfig | null | undefined>();
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");
  const [danger, setDanger] = useState(false);

  /**
   * 拉取服务列表并更新状态。
   * @returns 加载完成后的 Promise。
   */
  const load = useCallback(async (): Promise<void> => {
    setBusy(true);
    try {
      setServers(await listMcpServers(baseUrl, token));
      setDanger(false);
    } catch (caught) {
      setDanger(true);
      setMessage(caught instanceof Error ? caught.message : "加载 MCP 配置失败");
    } finally {
      setBusy(false);
    }
  }, [baseUrl, token]);

  useEffect(() => { void load(); }, [load]);

  /**
   * 新增或编辑时保存；编辑态走更新，否则新建。
   * @param server 待保存的服务配置。
   * @returns 保存完成后的 Promise。
   */
  const save = async (server: McpServerConfig): Promise<void> => {
    setBusy(true);
    try {
      if (editing) await updateMcpServer(baseUrl, token, server);
      else await createMcpServer(baseUrl, token, server);
      await load();
      setEditing(undefined);
      setDanger(false);
      setMessage("MCP 配置已保存");
    } finally {
      setBusy(false);
    }
  };

  /**
   * 测试连接并展示发现的工具数量。
   * @param server 待测试的服务配置。
   * @returns 测试完成后的 Promise。
   */
  const test = async (server: McpServerConfig): Promise<void> => {
    setBusy(true);
    try {
      const result = await testMcpServer(baseUrl, token, server);
      setDanger(false);
      setMessage(`连接成功，发现 ${result.toolCount} 个工具`);
    } finally {
      setBusy(false);
    }
  };

  /**
   * 切换服务的启用状态。
   * @param server 目标服务配置。
   * @returns 更新完成后的 Promise。
   */
  const toggle = async (server: McpServerConfig): Promise<void> => {
    setBusy(true);
    try {
      await updateMcpServer(baseUrl, token, { ...server, enabled: !server.enabled });
      await load();
    } catch (caught) {
      setDanger(true);
      setMessage(caught instanceof Error ? caught.message : "更新失败");
    } finally {
      setBusy(false);
    }
  };

  /**
   * 删除服务（带确认弹窗），成功后刷新列表。
   * @param server 待删除的服务配置。
   * @returns 无返回值。
   */
  const remove = (server: McpServerConfig): void => {
    Alert.alert("删除 MCP", `确认删除“${server.name}”？`, [
      { text: "取消", style: "cancel" },
      { text: "删除", style: "destructive", onPress: () => void deleteMcpServer(baseUrl, token, server.id)
        .then(load)
        .then(() => setMessage("MCP 配置已删除"))
        .catch((caught: unknown) => {
          setDanger(true);
          setMessage(caught instanceof Error ? caught.message : "删除失败");
        }) },
    ]);
  };

  if (editing !== undefined) {
    return <McpForm busy={busy} onBack={() => setEditing(undefined)} onSave={save} onTest={test} server={editing} />;
  }

  return (
    <View style={styles.panel}>
      <Button loading={busy && !servers.length} onPress={() => setEditing(null)}>新增 HTTP MCP</Button>
      <Notice danger={danger} message={message} />
      {servers.map((server) => (
        <View key={server.id} style={styles.serverItem}>
          <View style={styles.serverTopRow}>
            <View style={styles.flex}>
              <View style={styles.serverNameRow}>
                <Text numberOfLines={1} style={styles.itemTitle}>{server.name}</Text>
                <Text style={styles.httpBadge}>HTTP</Text>
              </View>
              <Text numberOfLines={1} style={styles.serverUrl}>{server.url}</Text>
            </View>
            <Switch disabled={busy} onValueChange={() => void toggle(server)} value={server.enabled} />
          </View>
          <View style={styles.serverActions}>
            <IconButton icon={<FlaskConical color={colors.primary} size={18} />} label={`测试 ${server.name}`} onPress={() => void test(server).catch((caught: unknown) => { setDanger(true); setMessage(caught instanceof Error ? caught.message : "测试失败"); })} />
            <IconButton icon={<Pencil color={colors.text} size={18} />} label={`编辑 ${server.name}`} onPress={() => setEditing(server)} />
            <IconButton icon={<Trash2 color={colors.danger} size={18} />} label={`删除 ${server.name}`} onPress={() => remove(server)} />
          </View>
        </View>
      ))}
      {!busy && !servers.length ? <Text style={styles.emptyText}>尚未配置 MCP Server</Text> : null}
    </View>
  );
};

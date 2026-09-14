import { KeyRound, ServerCog, Settings, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  createMcpServer,
  deleteMcpServer,
  listMcpServers,
  testMcpServer,
  updateMcpServer,
} from "../api";
import { cn } from "../lib/utils";
import type { McpConnectionTest, McpServerConfig } from "../types";
import { McpServerForm } from "./mcp-server-form";
import { SettingsContent } from "./settings-content";
import { Button } from "./ui/button";

const TOKEN_KEY = "assistant-config-token";

/**
 * 设置抽屉：管理模型与 MCP 配置。
 * 管理密钥只保存在当前会话的 sessionStorage 中，关闭会话即失效。
 */
export const McpSettingsDrawer = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) ?? "");
  const [tokenInput, setTokenInput] = useState("");
  const [servers, setServers] = useState<McpServerConfig[]>([]);
  const [editing, setEditing] = useState<McpServerConfig | null | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [section, setSection] = useState<"model" | "mcp">("model");

  /**
   * 拉取 MCP 服务列表。
   * @param accessToken 配置管理密钥。
   * @returns 加载完成后的 Promise。
   */
  const load = useCallback(async (accessToken: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      setServers(await listMcpServers(accessToken));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !token) return;
    void load(token).catch((caught: unknown) => {
      const message = caught instanceof Error ? caught.message : "加载 MCP 配置失败";
      setError(message);
      if (message.includes("密钥无效")) {
        sessionStorage.removeItem(TOKEN_KEY);
        setToken("");
      }
    });
  }, [load, open, token]);

  /**
   * 用密钥请求一次配置接口完成解锁，成功则写入 sessionStorage。
   * @returns 解锁流程完成后的 Promise。
   */
  const unlock = async (): Promise<void> => {
    const next = tokenInput.trim();
    if (!next) return;
    try {
      await load(next);
      sessionStorage.setItem(TOKEN_KEY, next);
      setToken(next);
      setTokenInput("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "解锁失败");
    }
  };

  /**
   * 保存 MCP 服务（新增或更新）并刷新列表。
   * @param value 待保存的服务配置。
   * @returns 保存完成后的 Promise。
   */
  const save = async (value: McpServerConfig): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      if (editing) await updateMcpServer(token, value);
      else await createMcpServer(token, value);
      await load(token);
      setEditing(undefined);
      setNotice("MCP 配置已保存");
    } finally {
      setLoading(false);
    }
  };

  /**
   * 测试连接并返回结构化结果（含工具清单）。
   * @param value 待测试的服务配置。
   * @returns 连接测试结果；失败时抛出异常。
   */
  const test = async (value: McpServerConfig): Promise<McpConnectionTest> => {
    setLoading(true);
    setError(null);
    try {
      const result = await testMcpServer(token, value);
      setNotice(value.name + "：连接成功，发现 " + (result.toolCount ?? result.tools?.length ?? 0) + " 个工具");
      return result;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 切换服务的启用状态。
   * @param server 目标服务配置。
   * @returns 更新完成后的 Promise。
   */
  const toggle = async (server: McpServerConfig): Promise<void> => {
    setLoading(true);
    try {
      await updateMcpServer(token, { ...server, enabled: !server.enabled });
      await load(token);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "更新失败");
    } finally {
      setLoading(false);
    }
  };

  /**
   * 删除服务（带确认）并刷新列表。
   * @param server 待删除的服务配置。
   * @returns 删除完成后的 Promise。
   */
  const remove = async (server: McpServerConfig): Promise<void> => {
    if (!window.confirm(`删除 MCP Server「${server.name}」？`)) return;
    setLoading(true);
    try {
      await deleteMcpServer(token, server.id ?? "");
      await load(token);
      setNotice("MCP 配置已删除");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "删除失败");
    } finally {
      setLoading(false);
    }
  };

  /**
   * 锁定设置：清除本地密钥并回到解锁页。
   * @returns 无返回值。
   */
  const lock = (): void => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken("");
    setServers([]);
    setEditing(undefined);
    setError(null);
  };

  return (
    <div className={cn("fixed inset-0 z-50 transition", open ? "pointer-events-auto" : "pointer-events-none")}>
      <button
        aria-label="关闭设置"
        className={cn("absolute inset-0 bg-foreground/25 transition-opacity", open ? "opacity-100" : "opacity-0")}
        onClick={onClose}
        type="button"
      />
      <aside className={cn(
        "absolute inset-y-0 right-0 flex w-full flex-col bg-background pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] shadow-xl transition-transform sm:w-[460px]",
        open ? "translate-x-0" : "translate-x-full",
      )}>
        <div className="flex h-14 shrink-0 items-center gap-2 border-b px-3">
          {editing !== undefined ? <ServerCog className="size-5 text-primary" /> : <Settings className="size-5 text-primary" />}
          <p className="min-w-0 flex-1 truncate font-semibold">
            {editing !== undefined ? (editing ? "编辑 MCP" : "新增 MCP") : "设置"}
          </p>
          {token && editing === undefined ? (
            <Button aria-label="锁定设置" onClick={lock} size="icon" title="锁定" variant="ghost"><KeyRound /></Button>
          ) : null}
          <Button aria-label="关闭" onClick={onClose} size="icon" variant="ghost"><X /></Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {!token ? (
            <form className="mx-auto flex min-h-full max-w-sm flex-col justify-center gap-4 px-5 py-10" onSubmit={(event) => { event.preventDefault(); void unlock(); }}>
              <div className="mx-auto grid size-12 place-items-center rounded-lg bg-accent text-accent-foreground"><KeyRound /></div>
              <label className="space-y-1.5 text-sm font-medium">
                设置管理密钥
                <input
                  autoComplete="current-password"
                  className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                  onChange={(event) => setTokenInput(event.target.value)}
                  type="password"
                  value={tokenInput}
                />
              </label>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <Button disabled={loading || !tokenInput.trim()} type="submit">解锁配置</Button>
            </form>
          ) : editing !== undefined ? (
            <McpServerForm
              busy={loading}
              onCancel={() => setEditing(undefined)}
              onSave={save}
              onTest={test}
              server={editing}
            />
          ) : (
            <SettingsContent
              error={error}
              loading={loading}
              notice={notice}
              onCreate={() => setEditing(null)}
              onEdit={setEditing}
              onRemove={(server) => void remove(server)}
              onSectionChange={setSection}
              onTest={(server) => void test(server).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "测试失败"))}
              onToggle={(server) => void toggle(server)}
              section={section}
              servers={servers}
              token={token}
            />
          )}
        </div>
      </aside>
    </div>
  );
};

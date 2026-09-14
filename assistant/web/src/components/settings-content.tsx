import { FlaskConical, Pencil, Plus, Trash2 } from "lucide-react";
import type { McpServerConfig } from "../types";
import { ModelSettingsPanel } from "./model-settings-panel";
import { Button } from "./ui/button";

/**
 * 设置内容区：按当前 section 渲染模型设置或 MCP 服务列表。
 * @param props.token 配置管理密钥。
 * @param props.section 当前展示的分区（模型或 MCP）。
 * @param props.servers MCP 服务列表。
 * @param props.loading 是否加载中。
 * @param props.notice 成功提示文案。
 * @param props.error 错误提示文案。
 * @param props.onSectionChange 切换分区回调。
 * @param props.onCreate 新增 MCP 回调。
 * @param props.onEdit 编辑 MCP 回调。
 * @param props.onToggle 启停 MCP 回调。
 * @param props.onTest 测试 MCP 回调。
 * @param props.onRemove 删除 MCP 回调。
 * @returns 设置内容区视图。
 */
export const SettingsContent = ({
  token,
  section,
  servers,
  loading,
  notice,
  error,
  onSectionChange,
  onCreate,
  onEdit,
  onToggle,
  onTest,
  onRemove,
}: {
  token: string;
  section: "model" | "mcp";
  servers: McpServerConfig[];
  loading: boolean;
  notice: string | null;
  error: string | null;
  onSectionChange: (section: "model" | "mcp") => void;
  onCreate: () => void;
  onEdit: (server: McpServerConfig) => void;
  onToggle: (server: McpServerConfig) => void;
  onTest: (server: McpServerConfig) => void;
  onRemove: (server: McpServerConfig) => void;
}) => (
  <>
    <div className="grid grid-cols-2 gap-1 border-b bg-muted/50 p-2">
      {(["model", "mcp"] as const).map((item) => (
        <button
          className={`h-9 rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${section === item ? "bg-background shadow-sm" : "text-muted-foreground"}`}
          key={item}
          onClick={() => onSectionChange(item)}
          type="button"
        >
          {item === "model" ? "模型" : "MCP"}
        </button>
      ))}
    </div>
    {section === "model" ? <ModelSettingsPanel token={token} /> : (
      <div className="space-y-3 p-3">
        <Button className="w-full" disabled={loading} onClick={onCreate} type="button"><Plus />新增 MCP Server</Button>
        {notice ? <p className="rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground">{notice}</p> : null}
        {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {servers.map((server) => (
          <article className="rounded-lg border p-3" key={server.id}>
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold">{server.name}</p>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium uppercase text-muted-foreground">HTTP</span>
                </div>
                <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{server.url}</p>
              </div>
              <label className="relative mt-0.5 inline-flex h-6 w-10 shrink-0 cursor-pointer items-center">
                <input aria-label={`${server.enabled ? "停用" : "启用"}${server.name}`} checked={server.enabled} className="peer sr-only" disabled={loading} onChange={() => onToggle(server)} type="checkbox" />
                <span className="absolute inset-0 rounded-full bg-muted transition peer-checked:bg-primary" />
                <span className="relative ml-1 size-4 rounded-full bg-background shadow transition-transform peer-checked:translate-x-4" />
              </label>
            </div>
            <div className="mt-3 flex justify-end gap-1 border-t pt-2">
              <Button aria-label={`测试 ${server.name}`} disabled={loading} onClick={() => onTest(server)} size="icon" title="测试连接" variant="ghost"><FlaskConical /></Button>
              <Button aria-label={`编辑 ${server.name}`} disabled={loading} onClick={() => onEdit(server)} size="icon" title="编辑" variant="ghost"><Pencil /></Button>
              <Button aria-label={`删除 ${server.name}`} disabled={loading} onClick={() => onRemove(server)} size="icon" title="删除" variant="ghost"><Trash2 /></Button>
            </div>
          </article>
        ))}
        {!servers.length && !loading ? <p className="py-10 text-center text-sm text-muted-foreground">尚未配置 MCP Server</p> : null}
        {loading ? <p className="py-6 text-center text-sm text-muted-foreground">正在加载…</p> : null}
      </div>
    )}
  </>
);

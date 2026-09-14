import { CheckCircle2, FlaskConical, Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { McpConnectionTest, McpServerConfig } from "../../types.ts";
import { Button } from "../../components/ui/button.tsx";
import { HttpFields, StdioFields } from "./mcp-server-fields.tsx";
import { toConfig, toDraft, type McpDraft } from "./mcp-form-utils.ts";

/**
 * 传输类型切换按钮。
 * @param props.active 当前是否激活。
 * @param props.label 按钮文案。
 * @param props.onClick 点击回调。
 * @returns 传输类型按钮。
 */
const TransportButton = ({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) => (
  <button
    className={
      "h-9 rounded-lg border px-3 text-sm font-medium transition " +
      (active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")
    }
    onClick={onClick}
    type="button"
  >
    {label}
  </button>
);

/**
 * MCP 服务新增/编辑表单：支持 http（URL + 请求头）与 stdio（命令 + 参数 + 环境变量）。
 * @param props.server 待编辑的服务配置，null 表示新增。
 * @param props.busy 是否处于加载中。
 * @param props.onCancel 取消回调。
 * @param props.onSave 保存回调。
 * @param props.onTest 测试回调，返回提示文案。
 * @returns MCP 编辑表单视图。
 */
const INPUT_CLASS =
  "h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";

/** 编辑单个 MCP 服务的传输配置并发起连接检查。
 * @param props 表单初始值、保存及连接检查回调。
 * @returns MCP 配置表单视图。 */
export const McpServerForm = ({
  server,
  busy,
  onCancel,
  onSave,
  onTest,
}: {
  server: McpServerConfig | null;
  busy: boolean;
  onCancel: () => void;
  onSave: (value: McpServerConfig) => Promise<void>;
  onTest: (value: McpServerConfig) => Promise<McpConnectionTest>;
}): React.JSX.Element => {
  const [draft, setDraft] = useState<McpDraft>(() => toDraft(server));
  const [message, setMessage] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<McpConnectionTest | null>(null);

  useEffect(() => {
    setDraft(toDraft(server));
    setMessage(null);
    setTestResult(null);
  }, [server]);

  /**
   * 执行保存或测试：先校验草稿，再调用对应回调。
   * @param action 要执行的操作（保存或测试）。
   * @returns 操作完成后的 Promise。
   */
  const run = async (action: "save" | "test"): Promise<void> => {
    try {
      setMessage(null);
      const value = toConfig(draft);
      if (action === "save") await onSave(value);
      else {
        const result = await onTest(value);
        // 旧版服务端可能只返回 toolCount，未返回 tools；这里统一补成数组，避免渲染时崩溃。
        setTestResult({ ...result, tools: result.tools ?? [] });
      }
    } catch (error) {
      setTestResult(null);
      setMessage(error instanceof Error ? error.message : "操作失败");
    }
  };

  return (
    <div className="space-y-5 px-4 py-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm font-medium">
          名称
          <input
            className={INPUT_CLASS}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            value={draft.name}
          />
        </label>
        {draft.id ? (
          <div className="space-y-1.5 text-sm font-medium">
            ID
            <input className={INPUT_CLASS + " cursor-not-allowed bg-muted"} disabled readOnly value={draft.id} />
          </div>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <span className="text-sm font-medium">传输方式</span>
        <div className="grid grid-cols-2 gap-2">
          <TransportButton
            active={draft.transport === "http"}
            label="HTTP（远端服务）"
            onClick={() => {
              setTestResult(null);
              setDraft({ ...draft, transport: "http" });
            }}
          />
          <TransportButton
            active={draft.transport === "stdio"}
            label="STDIO（本地命令）"
            onClick={() => {
              setTestResult(null);
              setDraft({ ...draft, transport: "stdio" });
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {draft.transport === "stdio"
            ? "由 Assistant 进程拉起本地命令作为 MCP 服务，无需手动开启服务；命令与环境变量支持 ${ENV_NAME} 展开。"
            : "连接远端 Streamable HTTP MCP 服务；请求头支持 ${ENV_NAME} 展开。"}
        </p>
      </div>

      {draft.transport === "http" ? (
        <HttpFields draft={draft} onChange={setDraft} />
      ) : (
        <StdioFields draft={draft} onChange={setDraft} />
      )}

      <label className="flex min-h-10 items-center gap-3 text-sm font-medium">
        <input
          checked={draft.enabled}
          className="size-4 accent-primary"
          onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })}
          type="checkbox"
        />
        启用此 Server
      </label>

      {testResult ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="size-4" />
            连接成功，发现 {testResult.toolCount ?? testResult.tools?.length ?? 0} 个工具
          </p>
          {testResult.tools && testResult.tools.length > 0 ? (
            <ul className="mt-2 max-h-48 space-y-1 overflow-auto">
              {testResult.tools?.map((tool) => (
                <li className="rounded bg-white/70 px-2 py-1" key={tool.name}>
                  <p className="break-all font-mono text-xs font-medium">{tool.name}</p>
                  {tool.description ? (
                    <p className="mt-0.5 line-clamp-2 break-words text-xs text-muted-foreground">{tool.description}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {message ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p> : null}

      <div className="grid grid-cols-3 gap-2 border-t pt-4">
        <Button disabled={busy} onClick={onCancel} type="button" variant="outline">
          <X />
          取消
        </Button>
        <Button disabled={busy} onClick={() => void run("test")} type="button" variant="outline">
          <FlaskConical />
          测试
        </Button>
        <Button disabled={busy} onClick={() => void run("save")} type="button">
          <Save />
          保存
        </Button>
      </div>
    </div>
  );
};

import { KeyValueEditor } from "./key-value-editor.tsx";
import type { McpDraft } from "./mcp-form-utils.ts";

const INPUT_CLASS =
  "h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";

/**
 * HTTP 传输字段区：URL 与请求头。
 * @param props.draft 表单草稿。
 * @param props.onChange 草稿变化回调。
 * @returns HTTP 字段区视图。
 */
export const HttpFields = ({
  draft,
  onChange,
}: {
  draft: McpDraft;
  onChange: (draft: McpDraft) => void;
}): React.JSX.Element => (
  <>
    <label className="block space-y-1.5 text-sm font-medium">
      MCP HTTP URL
      <input
        className={INPUT_CLASS}
        onChange={(event) => onChange({ ...draft, url: event.target.value })}
        placeholder="https://example.com/mcp"
        value={draft.url}
      />
    </label>
    <KeyValueEditor label="请求头" onChange={(headers) => onChange({ ...draft, headers })} pairs={draft.headers} />
  </>
);

/**
 * stdio 传输字段区：启动命令、参数（每行一个）与环境变量。
 * @param props.draft 表单草稿。
 * @param props.onChange 草稿变化回调。
 * @returns stdio 字段区视图。
 */
export const StdioFields = ({
  draft,
  onChange,
}: {
  draft: McpDraft;
  onChange: (draft: McpDraft) => void;
}): React.JSX.Element => (
  <>
    <label className="block space-y-1.5 text-sm font-medium">
      启动命令
      <input
        className={INPUT_CLASS}
        onChange={(event) => onChange({ ...draft, command: event.target.value })}
        placeholder="node"
        value={draft.command}
      />
    </label>
    <label className="block space-y-1.5 text-sm font-medium">
      启动参数（每行一个）
      <textarea
        className="min-h-20 w-full rounded-lg border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        onChange={(event) => onChange({ ...draft, argsText: event.target.value })}
        placeholder={"/path/to/mcp-server/dist/index.js\n--flag"}
        value={draft.argsText}
      />
    </label>
    <label className="block space-y-1.5 text-sm font-medium">
      工作目录（可选）
      <input
        className={INPUT_CLASS}
        onChange={(event) => onChange({ ...draft, cwd: event.target.value })}
        placeholder="缺省继承 Assistant 进程目录"
        value={draft.cwd}
      />
    </label>
    <KeyValueEditor label="环境变量" onChange={(env) => onChange({ ...draft, env })} pairs={draft.env} />
  </>
);

import { FlaskConical, Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { McpServerConfig } from "../types";
import { KeyValueEditor } from "./key-value-editor";
import {
  pairsToRecord,
  recordToPairs,
  type KeyValuePair,
} from "./mcp-form-utils";
import { Button } from "./ui/button";

// 表单草稿：请求头用键值对数组承载，便于编辑与增删。
type Draft = {
  id: string;
  name: string;
  enabled: boolean;
  url: string;
  headers: KeyValuePair[];
};

/**
 * 生成空的表单草稿。
 * @returns 全空的 MCP 表单草稿。
 */
const emptyDraft = (): Draft => ({
  id: "",
  name: "",
  enabled: true,
  url: "",
  headers: [],
});

/**
 * 服务端配置 → 表单草稿（headers 展开为数组）。
 * @param server 服务端保存的 MCP 配置，可空。
 * @returns 可用于表单编辑的草稿。
 */
const toDraft = (server: McpServerConfig | null): Draft => server
  ? { ...server, headers: recordToPairs(server.headers) }
  : emptyDraft();

/**
 * 表单草稿 → 服务端配置，做基础校验并过滤空请求头。
 * @param draft 表单编辑中的草稿。
 * @returns 校验通过的服务端配置；必填缺失或格式非法时抛出异常。
 */
const toConfig = (draft: Draft): McpServerConfig => {
  const id = draft.id.trim();
  const name = draft.name.trim();
  const url = draft.url.trim();
  if (!id || !name) throw new Error("请填写名称和 ID");
  if (!/^[a-z0-9-]+$/.test(id)) {
    throw new Error("ID 只能包含小写字母、数字和连字符");
  }
  if (!url) throw new Error("请填写 MCP HTTP URL");
  // URL 必须为 http/https，用 URL 构造函数做完整校验。
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error();
    }
  } catch {
    throw new Error("MCP URL 必须使用 http:// 或 https://");
  }
  return {
    id,
    name,
    enabled: draft.enabled,
    url,
    headers: pairsToRecord(draft.headers),
  };
};

const inputClass = "h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";

/**
 * MCP 服务新增/编辑表单。
 * @param props.server 待编辑的服务配置，null 表示新增。
 * @param props.busy 是否处于加载中。
 * @param props.onCancel 取消回调。
 * @param props.onSave 保存回调。
 * @param props.onTest 测试回调，返回提示文案。
 * @returns MCP 编辑表单视图。
 */
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
  onTest: (value: McpServerConfig) => Promise<string>;
}) => {
  const [draft, setDraft] = useState<Draft>(() => toDraft(server));
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setDraft(toDraft(server));
    setMessage(null);
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
      else setMessage(await onTest(value));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败");
    }
  };

  return (
    <div className="space-y-5 px-4 py-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm font-medium">
          名称
          <input className={inputClass} onChange={(event) => setDraft({ ...draft, name: event.target.value })} value={draft.name} />
        </label>
        <label className="space-y-1.5 text-sm font-medium">
          ID
          <input className={inputClass} disabled={Boolean(server)} onChange={(event) => setDraft({ ...draft, id: event.target.value.toLowerCase() })} value={draft.id} />
        </label>
      </div>

      <label className="block space-y-1.5 text-sm font-medium">
        MCP HTTP URL
        <input className={inputClass} onChange={(event) => setDraft({ ...draft, url: event.target.value })} placeholder="https://example.com/mcp" value={draft.url} />
      </label>
      <KeyValueEditor label="请求头" onChange={(headers) => setDraft({ ...draft, headers })} pairs={draft.headers} />

      <label className="flex min-h-10 items-center gap-3 text-sm font-medium">
        <input checked={draft.enabled} className="size-4 accent-primary" onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} type="checkbox" />
        启用此 Server
      </label>

      {message ? <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{message}</p> : null}

      <div className="grid grid-cols-3 gap-2 border-t pt-4">
        <Button disabled={busy} onClick={onCancel} type="button" variant="outline"><X />取消</Button>
        <Button disabled={busy} onClick={() => void run("test")} type="button" variant="outline"><FlaskConical />测试</Button>
        <Button disabled={busy} onClick={() => void run("save")} type="button"><Save />保存</Button>
      </div>
    </div>
  );
};

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

type Draft = {
  id: string;
  name: string;
  enabled: boolean;
  url: string;
  headers: KeyValuePair[];
};

const emptyDraft = (): Draft => ({
  id: "",
  name: "",
  enabled: true,
  url: "",
  headers: [],
});

const toDraft = (server: McpServerConfig | null): Draft => server
  ? { ...server, headers: recordToPairs(server.headers) }
  : emptyDraft();

const toConfig = (draft: Draft): McpServerConfig => {
  const id = draft.id.trim();
  const name = draft.name.trim();
  const url = draft.url.trim();
  if (!id || !name) throw new Error("请填写名称和 ID");
  if (!/^[a-z0-9-]+$/.test(id)) {
    throw new Error("ID 只能包含小写字母、数字和连字符");
  }
  if (!url) throw new Error("请填写 MCP HTTP URL");
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

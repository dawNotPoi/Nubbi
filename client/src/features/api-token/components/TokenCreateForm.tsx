import type { ReactElement } from "react";
import type { TokenPurpose } from "../model";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Bot, Globe2 } from "lucide-react";
import { EXPIRY_OPTIONS } from "../hooks/useApiTokenManager";

type TokenCreateFormProps = {
  creating: boolean;
  expiresIn: number;
  purpose: TokenPurpose;
  tokenName: string;
  onCreate: () => void;
  onExpiresInChange: (value: number) => void;
  onPurposeChange: (value: TokenPurpose) => void;
  onTokenNameChange: (value: string) => void;
};

/**
 * 用原生表单和单选项区分两种真实 Token 权限。
 * @param props 创建状态、当前配置及变更回调。
 * @returns Token 创建表单。
 */
export function TokenCreateForm({ creating, expiresIn, onCreate, onExpiresInChange, onPurposeChange, onTokenNameChange, purpose, tokenName }: TokenCreateFormProps): ReactElement {
  const isMcp = purpose === "mcp";
  return <form onSubmit={(event) => { event.preventDefault(); if (!creating && tokenName.trim()) onCreate(); }} className="space-y-3 rounded-control border border-border-toolbar bg-bg-panel p-3">
    <fieldset disabled={creating} className="min-w-0 space-y-2">
      <legend className="text-sm font-medium">Token 用途</legend>
      <p className="text-xs text-text-muted">{isMcp ? "仅允许 Agent 读笔记，并管理它创建的笔记" : "保留现有通用 API 的完整账号能力"}</p>
      <div className="flex flex-wrap gap-2">
        {([{ value: "mcp", label: "MCP Agent", Icon: Bot }, { value: "general", label: "通用 API", Icon: Globe2 }] as const).map(({ value, label, Icon }) => <label key={value} className="flex min-h-9 cursor-pointer items-center gap-2 rounded-control border border-border-toolbar px-3 text-sm has-[:checked]:border-accent-border has-[:checked]:bg-accent-bg max-md:min-h-11">
          <input type="radio" name="token-purpose" value={value} checked={purpose === value} onChange={() => onPurposeChange(value)} className="accent-[var(--accent-text)]" />
          <Icon aria-hidden="true" className="size-4" />{label}
        </label>)}
      </div>
    </fieldset>
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
      <Input aria-label="Token 名称" className="min-w-0 flex-1 pl-3 max-md:h-11" maxLength={32} disabled={creating} onChange={(event) => onTokenNameChange(event.target.value)} placeholder={isMcp ? "名称（如：本地 Claude）" : "名称（如：博客）"} value={tokenName} />
      <Select aria-label="有效期" className="w-full shrink-0 sm:w-28" disabled={creating} onValueChange={(value) => onExpiresInChange(Number(value))} options={EXPIRY_OPTIONS.map((option) => ({ ...option, value: String(option.value) }))} value={String(expiresIn)} />
      <Button className="shrink-0 max-md:h-11" disabled={!tokenName.trim()} loading={creating} type="submit" variant="primary">生成 Token</Button>
    </div>
  </form>;
}

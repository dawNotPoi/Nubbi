import type { ReactElement } from "react";
import type { TokenPurpose } from "../model";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Bot, Globe2, Plus } from "lucide-react";
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
 * 用用途卡片说明真实权限，常驻标签保证输入后仍可辨认字段。
 * @param props 创建状态、当前配置及变更回调。
 * @returns 密钥创建表单。
 */
export function TokenCreateForm({ creating, expiresIn, onCreate, onExpiresInChange, onPurposeChange, onTokenNameChange, purpose, tokenName }: TokenCreateFormProps): ReactElement {
  return (
    <form onSubmit={(event) => { event.preventDefault(); if (!creating && tokenName.trim()) onCreate(); }} className="space-y-5 rounded-panel border border-border-row bg-bg-panel p-4 md:p-5">
      <h2 className="text-sm font-semibold">创建密钥</h2>
      <fieldset disabled={creating} className="min-w-0">
        <legend className="mb-2 text-xs text-text-muted">选择用途</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {([
            { value: "mcp", label: "MCP Agent", Icon: Bot, description: "读取笔记，并管理 Agent 创建的笔记。" },
            { value: "general", label: "通用 API", Icon: Globe2, description: "用于外部程序集成，拥有完整账号能力。" },
          ] as const).map(({ value, label, Icon, description }) => (
            <label key={value} className="flex cursor-pointer items-start gap-3 rounded-control border border-border-button bg-surface p-3 transition-colors hover:border-border-button-hover has-[:checked]:border-[var(--primary)] has-[:checked]:bg-[var(--workspace-featured)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-focus-ring has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
              <input type="radio" name="token-purpose" value={value} checked={purpose === value} onChange={() => onPurposeChange(value)} className="mt-1 size-4 shrink-0 accent-[var(--primary)]" />
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-sm font-medium"><Icon aria-hidden="true" className="size-4" />{label}</span>
                <span className="mt-2 block text-xs leading-5 text-text-muted">{description}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_160px]">
        <label className="space-y-2 text-xs text-text-muted">
          <span className="block">密钥名称</span>
          <Input className="h-9 w-full pl-3" maxLength={32} disabled={creating} onChange={(event) => onTokenNameChange(event.target.value)} placeholder={purpose === "mcp" ? "例如：本地 Claude" : "例如：博客发布工具"} value={tokenName} />
        </label>
        <div className="space-y-2 text-xs text-text-muted">
          <span id="token-expiry-label" className="block">有效期</span>
          <Select aria-labelledby="token-expiry-label" className="h-9 w-full" disabled={creating} onValueChange={(value) => onExpiresInChange(Number(value))} options={EXPIRY_OPTIONS.map((option) => ({ ...option, value: String(option.value) }))} value={String(expiresIn)} />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs leading-5 text-text-muted">完整密钥仅在创建后显示一次。</p>
        <Button size="lg" icon={<Plus />} disabled={!tokenName.trim()} loading={creating} type="submit" variant="primary">创建密钥</Button>
      </div>
    </form>
  );
}

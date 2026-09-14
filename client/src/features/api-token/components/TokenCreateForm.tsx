import type { TokenPurpose } from "../model";
import { Button, Input, Segmented, Select, Typography } from "antd";
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

export function TokenCreateForm({
  creating,
  expiresIn,
  onCreate,
  onExpiresInChange,
  onPurposeChange,
  onTokenNameChange,
  purpose,
  tokenName,
}: TokenCreateFormProps) {
  const isMcp = purpose === "mcp";

  return (
    <section className="space-y-3 rounded-md border border-border-toolbar bg-bg-panel p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Typography.Text strong>Token 用途</Typography.Text>
          <div className="text-xs text-text-muted">
            {isMcp
              ? "仅允许 Agent 读笔记，并管理它创建的笔记"
              : "保留现有通用 API 的完整账号能力"}
          </div>
        </div>
        <Segmented
          options={[
            { label: "MCP Agent", value: "mcp", icon: <Bot className="size-4" /> },
            { label: "通用 API", value: "general", icon: <Globe2 className="size-4" /> },
          ]}
          onChange={(value) => onPurposeChange(value as TokenPurpose)}
          value={purpose}
        />
      </div>

      <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
        <Input
          className="min-w-0 flex-1"
          maxLength={32}
          onChange={(event) => onTokenNameChange(event.target.value)}
          onPressEnter={onCreate}
          placeholder={isMcp ? "名称（如：本地 Claude）" : "名称（如：博客）"}
          value={tokenName}
        />
        <Select
          className="w-full shrink-0 sm:w-28"
          onChange={onExpiresInChange}
          options={EXPIRY_OPTIONS}
          value={expiresIn}
        />
        <Button
          className="shrink-0"
          disabled={!tokenName.trim()}
          loading={creating}
          onClick={onCreate}
          type="primary"
        >
          生成 Token
        </Button>
      </div>
    </section>
  );
}

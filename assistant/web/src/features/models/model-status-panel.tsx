import { Boxes, Cpu, Gauge, MessageSquare, Puzzle } from "lucide-react";
import { cn } from "../../lib/utils.ts";
import type { TokenUsage } from "../../types.ts";

/** /status 面板所需的全部状态数据。 */
export type ModelStatusInfo = {
  provider: "openai-compatible" | "codex-subscription";
  model: string;
  baseUrl: string;
  contextWindow?: number;
  /** ChatGPT 订阅计划，仅订阅模式有值。 */
  planType?: string;
  /** 本对话累计 + 本轮新增的 token 用量。 */
  tokenUsage: TokenUsage | null;
  contextUsage: { usedTokens: number; maxTokens: number; truncated: boolean };
  conversation: { title: string; messageCount: number };
  capabilities: {
    skillsEnabled: number;
    skillsTotal: number;
    mcpAvailable: number;
    mcpTotal: number;
  };
};

/** 把数字格式化为可读文本，如 12800 → 12.8k。 */
const formatTokens = (value: number | undefined): string => {
  if (value === undefined) return "未提供";
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  return String(value);
};

/** 单行「标签 + 值」。 */
const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-baseline justify-between gap-3 px-3 py-1.5 text-sm">
    <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
    <span className="min-w-0 truncate text-right text-foreground">{children}</span>
  </div>
);

/** 分区标题。 */
const SectionTitle = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <p className="flex items-center gap-1.5 border-b bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground">
    {icon}
    {text}
  </p>
);

/**
 * 模型状态面板：展示模型、订阅、token 用量、上下文占用、会话与能力状态。
 * @param props.info 状态数据。
 * @returns 面板视图。
 */
export const ModelStatusPanel = ({ info }: { info: ModelStatusInfo }): React.JSX.Element => {
  const { tokenUsage, contextUsage } = info;
  const contextPercent =
    contextUsage.maxTokens > 0
      ? Math.min(100, Math.round((contextUsage.usedTokens / contextUsage.maxTokens) * 100))
      : 0;
  const levelColor =
    contextPercent >= 90 ? "text-red-500" : contextPercent >= 70 ? "text-amber-500" : "text-emerald-500";
  const providerLabel = info.provider === "codex-subscription" ? "ChatGPT 订阅" : "OpenAI 兼容";

  return (
    <div className="py-1">
      <SectionTitle icon={<Cpu className="size-3.5" />} text="模型" />
      <div className="py-1">
        <Row label="模型">{info.model || "未配置"}</Row>
        <Row label="提供方">{providerLabel}</Row>
        <Row label="Base URL">{info.baseUrl || "—"}</Row>
        {info.contextWindow ? <Row label="上下文窗口">{formatTokens(info.contextWindow)} tokens</Row> : null}
        {info.planType ? <Row label="订阅">{info.planType}</Row> : null}
      </div>

      <SectionTitle icon={<Gauge className="size-3.5" />} text="Token 用量" />
      <div className="py-1">
        <Row label="Prompt">{formatTokens(tokenUsage?.promptTokens)}</Row>
        <Row label="Completion">{formatTokens(tokenUsage?.completionTokens)}</Row>
        <Row label="总计">{tokenUsage ? `${formatTokens(tokenUsage.totalTokens)} tokens` : "未提供"}</Row>
      </div>

      <SectionTitle icon={<Gauge className="size-3.5" />} text="上下文估算" />
      <div className="flex items-center gap-2 px-3 py-2 text-sm">
        <span className={cn("text-xs text-muted-foreground")}>
          {formatTokens(contextUsage.usedTokens)} / {formatTokens(contextUsage.maxTokens)} tokens
        </span>
        <span className={cn("text-xs font-medium", levelColor)}>{contextPercent}%</span>
        {contextUsage.truncated ? (
          <span className="rounded bg-amber-50 px-1 py-0.5 text-[10px] font-medium text-amber-700">已压缩</span>
        ) : null}
      </div>

      <SectionTitle icon={<MessageSquare className="size-3.5" />} text="会话" />
      <div className="py-1">
        <Row label="标题">{info.conversation.title || "—"}</Row>
        <Row label="消息数">{info.conversation.messageCount} 条</Row>
      </div>

      <SectionTitle icon={<Boxes className="size-3.5" />} text="能力" />
      <div className="py-1">
        <Row label="技能">
          <span className="inline-flex items-center gap-1">
            <Puzzle className="size-3 text-primary" />
            {info.capabilities.skillsEnabled} / {info.capabilities.skillsTotal} 启用
          </span>
        </Row>
        <Row label="MCP">
          {info.capabilities.mcpAvailable} / {info.capabilities.mcpTotal} 可用
        </Row>
      </div>
    </div>
  );
};

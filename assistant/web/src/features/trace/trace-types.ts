/** 轨迹时间线中的一条展示项。 */
export type TraceItem =
  | {
      kind: "run";
      provider: "openai-compatible" | "codex-subscription";
      timestamp?: string;
    }
  | { kind: "reasoning"; text: string; timestamp?: string }
  | { kind: "text"; text: string; timestamp?: string }
  | { kind: "skill"; name: string; description: string; timestamp?: string }
  | {
      kind: "tool";
      id: string;
      server: string;
      tool: string;
      arguments: Record<string, unknown>;
      result?: string;
      success?: boolean;
      durationMs?: number;
      status: "running" | "done";
      timestamp?: string;
    }
  | {
      kind: "approval";
      id: string;
      server: string;
      tool: string;
      approved?: boolean;
      timestamp?: string;
    }
  | {
      kind: "token";
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      timestamp?: string;
    }
  | {
      kind: "end";
      status: "completed" | "failed" | "cancelled" | "abandoned";
      message?: string;
      timestamp?: string;
    }
  | { kind: "error"; message: string; timestamp?: string };

/**
 * 一条消息中的独立内容块。
 * 普通文本、Skill 激活记录、工具审批/执行记录或运行错误各自成块，便于前后端分别渲染。
 */
export type MessagePart =
  | { type: "text"; text: string }
  | { type: "skill"; name: string; description: string }
  | {
      type: "approval";
      approvalId: string;
      server: string;
      tool: string;
      arguments: Record<string, unknown>;
      approved: boolean;
    }
  | {
      type: "tool";
      callId?: string;
      server: string;
      tool: string;
      arguments: Record<string, unknown>;
      result: string;
      success?: boolean;
    }
  | { type: "error"; message: string };

export type Message = {
  id: string;
  role: "user" | "assistant";
  parts: MessagePart[];
  createdAt: string;
};

export type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  // 关联的 Codex 订阅会话线程 ID，用于跨轮续接 Codex 上下文。
  codexThreadId?: string;
};

/** 传给模型的 function 工具定义（OpenAI function calling 格式）。 */
export type ModelTool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

/** 与模型多轮对话使用的消息结构。 */
export type ModelMessage =
  | { role: "system" | "user"; content: string }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }>;
    }
  | { role: "tool"; tool_call_id: string; content: string };

/** 模型发起的工具调用，arguments 已解析为对象。 */
export type ModelToolCall = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};

export type {
  AgentEvent,
  RunStatus,
  RunSummary,
  RuntimeEvent,
  RuntimeEventMeta,
  RuntimeEventPayload,
} from "./runtime/events.js";

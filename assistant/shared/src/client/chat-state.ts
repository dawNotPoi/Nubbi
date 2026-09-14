import type {
  ApprovalRequest,
  ContextStatus,
  Conversation,
  ConversationSummary,
  StreamEvent,
  TokenUsage,
} from "../contracts/index.ts";
import { applyMessageEvent, type ClientMessage } from "./message-state.ts";

/** 平台无关聊天状态，临时输出与持久化对话分开管理。 */
export type ChatViewState = {
  conversations: ConversationSummary[];
  selectedConversation: Conversation | null;
  pendingMessages: ClientMessage[];
  messages: ClientMessage[];
  approval: ApprovalRequest | null;
  contextStatus: ContextStatus | null;
  runTokenUsage: TokenUsage | null;
  traceEvents: StreamEvent[];
  traceRunId: string | null;
  traceText: string;
  generating: boolean;
  loading: boolean;
  error: string | null;
};

/**
 * 创建聊天初始状态。
 * @returns 无对话、无运行记录的状态。
 */
export function createChatViewState(): ChatViewState {
  return {
    conversations: [],
    selectedConversation: null,
    pendingMessages: [],
    messages: [],
    approval: null,
    contextStatus: null,
    runTokenUsage: null,
    traceEvents: [],
    traceRunId: null,
    traceText: "",
    generating: false,
    loading: true,
    error: null,
  };
}

/**
 * 开始新运行时清空瞬时指标与审批，不改写已经保存的对话。
 * @returns 本次运行的初始视图字段。
 */
export function createRunViewPatch(): Partial<ChatViewState> {
  return {
    generating: true,
    loading: false,
    error: null,
    runTokenUsage: null,
    traceEvents: [],
    traceRunId: null,
    traceText: "",
    approval: null,
  };
}

/**
 * 归并一次运行事件，只处理数据，不访问网络或平台 API。
 * @param state 当前视图状态。
 * @param event 当前运行事件。
 * @returns 需要更新的状态字段。
 */
export function reduceChatEvent(state: ChatViewState, event: StreamEvent): Partial<ChatViewState> {
  const patch: Partial<ChatViewState> = {
    pendingMessages: state.pendingMessages.map((message) =>
      message.role === "assistant" ? { ...message, parts: applyMessageEvent(message.parts, event) } : message,
    ),
  };
  if (event.type === "approval-request") patch.approval = event;
  if (event.type === "approval-resolved" && event.approvalId === state.approval?.approvalId) patch.approval = null;
  if (event.type === "context-status") patch.contextStatus = event;
  if (event.type === "token-usage") patch.runTokenUsage = event;
  if (event.type === "message-start") patch.traceRunId = event.runId ?? null;
  if (event.type === "text-delta") patch.traceText = state.traceText + event.text;
  if (!["text-delta", "context-status", "message-start", "assistant-message", "done"].includes(event.type))
    patch.traceEvents = [...state.traceEvents, event];
  return patch;
}

/** 可订阅的聊天状态，不依赖 UI 框架。 */
export class ChatStateStore {
  private state = createChatViewState();
  private readonly listeners = new Set<() => void>();

  /**
   * 获取稳定快照，仅更新时替换对象。
   * @returns 当前状态。
   */
  public getSnapshot = (): ChatViewState => this.state;

  /**
   * 订阅状态变化。
   * @param listener 更新通知函数。
   * @returns 取消订阅函数。
   */
  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /**
   * 原子更新状态，避免历史用量与本轮用量交叉叠加。
   * @param patch 待更新字段。
   * @returns 无返回值。
   */
  public update(patch: Partial<ChatViewState>): void {
    const next = { ...this.state, ...patch };
    next.messages = [...(next.selectedConversation?.messages ?? []), ...next.pendingMessages];
    this.state = next;
    this.listeners.forEach((listener) => listener());
  }
}

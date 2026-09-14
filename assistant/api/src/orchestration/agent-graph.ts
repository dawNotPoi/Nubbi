import {
  END,
  START,
  StateGraph,
} from "@langchain/langgraph";
import type { StoredModelConfig } from "../model-config.js";
import { requestModel } from "../model.js";
import type { Skill } from "../skills.js";
import type {
  AgentEvent,
  ModelMessage,
  ModelTool,
} from "../types.js";
import { AgentState, type AgentStateValue } from "./agent-state.js";
import type { ToolGateway } from "../runtime/tool-gateway.js";
import { executeToolCalls } from "./tool-executor.js";

const maxTurns = 8;  // 防止模型陷入无限工具调用循环
const limitText = "已达到最大执行轮数，请缩小问题范围后重试。";

export type AgentGraphContext = {
  skills: Skill[];
  modelTools: ModelTool[];
  gateway: ToolGateway;
  modelConfig: StoredModelConfig;
  signal: AbortSignal;
  emit: (event: AgentEvent) => void;
};

// 把长文本切成小段逐个推送，前端能更流畅地渲染流式输出。
const emitText = (text: string, emit: AgentGraphContext["emit"]): void => {
  (text.match(/[\s\S]{1,36}/g) ?? []).forEach((chunk) => {
    emit({ type: "text-delta", text: chunk });
  });
};

/** 模型节点：请求模型，若有工具调用则转工具节点，否则产出最终文本。 */
const createModelNode = (context: AgentGraphContext) => async (
  state: AgentStateValue,
): Promise<Partial<AgentStateValue>> => {
  context.signal.throwIfAborted();
  const reply = await requestModel(
    state.messages,
    context.modelTools,
    context.signal,
    context.modelConfig,
  );
  const turn = state.turn + 1;
  const messages = [...state.messages, reply.assistantMessage];
  if (reply.toolCalls.length) {
    return { messages, pendingToolCalls: reply.toolCalls, turn };
  }
  const text = reply.content.trim() || "任务已完成。";
  emitText(text, context.emit);
  return {
    messages,
    pendingToolCalls: [],
    parts: [...state.parts, { type: "text", text }],
    turn,
  };
};

/** 工具节点：并行执行待处理的工具调用，并把结果回填进消息历史。 */
const createToolNode = (context: AgentGraphContext) => async (
  state: AgentStateValue,
): Promise<Partial<AgentStateValue>> => {
  const messages: ModelMessage[] = [...state.messages];
  const parts = [...state.parts];
  const activeSkills = new Set(state.activeSkills);
  const instructions: string[] = [];

  context.signal.throwIfAborted();
  const results = await executeToolCalls(state.pendingToolCalls, { ...context, activeSkills });
  results.forEach((result, index) => {
    const call = state.pendingToolCalls[index];
    if (!call) return;
    messages.push({ role: "tool", tool_call_id: call.id, content: result.content });
    parts.push(...result.parts);
    if (result.instruction) instructions.push(result.instruction);
  });
  instructions.forEach((content) => messages.push({ role: "system", content }));
  return {
    messages,
    parts,
    activeSkills: [...activeSkills],
    pendingToolCalls: [],
  };
};

/** 达到最大轮数时的兜底节点：提示用户并结束。 */
const createLimitNode = (context: AgentGraphContext) => (
  state: AgentStateValue,
): Partial<AgentStateValue> => {
  emitText(limitText, context.emit);
  return { parts: [...state.parts, { type: "text", text: limitText }] };
};

/**
 * 用 LangGraph 编排“模型 → 工具 → 模型”的循环：
 * model 返回工具调用时进入 tools，tools 执行完回到 model，直到无工具调用或达到轮数上限。
 */
export const createAgentGraph = (context: AgentGraphContext) => new StateGraph(AgentState)
  .addNode("model", createModelNode(context))
  .addNode("tools", createToolNode(context))
  .addNode("limit", createLimitNode(context))
  .addEdge(START, "model")
  .addConditionalEdges(
    "model",
    (state) => state.pendingToolCalls.length ? "tools" : END,
    ["tools", END],
  )
  .addConditionalEdges(
    "tools",
    (state) => state.turn >= maxTurns ? "limit" : "model",
    ["limit", "model"],
  )
  .addEdge("limit", END)
  .compile({ name: "nubbi-assistant-agent" });

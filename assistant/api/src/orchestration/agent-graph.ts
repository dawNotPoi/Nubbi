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

const maxTurns = 8;
const limitText = "已达到最大执行轮数，请缩小问题范围后重试。";

export type AgentGraphContext = {
  skills: Skill[];
  modelTools: ModelTool[];
  gateway: ToolGateway;
  modelConfig: StoredModelConfig;
  signal: AbortSignal;
  emit: (event: AgentEvent) => void;
};

const emitText = (text: string, emit: AgentGraphContext["emit"]): void => {
  (text.match(/[\s\S]{1,36}/g) ?? []).forEach((chunk) => {
    emit({ type: "text-delta", text: chunk });
  });
};

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

const createLimitNode = (context: AgentGraphContext) => (
  state: AgentStateValue,
): Partial<AgentStateValue> => {
  emitText(limitText, context.emit);
  return { parts: [...state.parts, { type: "text", text: limitText }] };
};

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

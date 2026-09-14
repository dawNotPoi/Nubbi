import { Annotation } from "@langchain/langgraph";
import type {
  MessagePart,
  ModelMessage,
  ModelToolCall,
} from "../types.js";

/**
 * Agent 图的共享状态：
 * - messages：传给模型的多轮消息历史（含工具结果回填）；
 * - pendingToolCalls：本回合待执行的工具调用；
 * - parts：最终要落库到助手消息的内容块；
 * - activeSkills：本 Run 已激活的 Skill 集合，避免重复激活；
 * - turn：当前轮数，用于限制最大执行轮数。
 */
export const AgentState = Annotation.Root({
  messages: Annotation<ModelMessage[]>,
  pendingToolCalls: Annotation<ModelToolCall[]>,
  parts: Annotation<MessagePart[]>,
  activeSkills: Annotation<string[]>,
  turn: Annotation<number>,
});

export type AgentStateValue = typeof AgentState.State;

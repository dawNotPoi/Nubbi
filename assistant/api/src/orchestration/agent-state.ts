import { Annotation } from "@langchain/langgraph";
import type {
  MessagePart,
  ModelMessage,
  ModelToolCall,
} from "../types.js";

export const AgentState = Annotation.Root({
  messages: Annotation<ModelMessage[]>,
  pendingToolCalls: Annotation<ModelToolCall[]>,
  parts: Annotation<MessagePart[]>,
  activeSkills: Annotation<string[]>,
  turn: Annotation<number>,
});

export type AgentStateValue = typeof AgentState.State;

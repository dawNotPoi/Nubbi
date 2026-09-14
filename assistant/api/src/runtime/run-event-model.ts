import { Schema } from "mongoose";
import { assistantConnection } from "../db.js";

/** Run 事件在 MongoDB 中的落库结构：元信息平铺，业务数据统一放 payload。 */
export type RunEventRecord = {
  eventId: string;
  runId: string;
  conversationId: string;
  sequence: number;
  timestamp: string;
  agentId: string;
  parentRunId?: string;
  type: string;
  payload: Record<string, unknown>;
};

const runEventSchema = new Schema<RunEventRecord>({
  // 高频查询字段都建索引，避免 Run 审计接口随数据增长变慢。
  eventId: { type: String, required: true, unique: true, index: true },
  runId: { type: String, required: true, index: true },
  conversationId: { type: String, required: true, index: true },
  sequence: { type: Number, required: true },
  timestamp: { type: String, required: true },
  agentId: { type: String, required: true },
  parentRunId: { type: String },
  type: { type: String, required: true },
  payload: { type: Schema.Types.Mixed, required: true },
}, {
  collection: "run_events",
  id: false,
  versionKey: false,
});

// 同一 Run 内 sequence 唯一，保证事件顺序可重放。
runEventSchema.index({ runId: 1, sequence: 1 }, { unique: true });
// 按对话倒序查最近事件。
runEventSchema.index({ conversationId: 1, timestamp: -1 });

export const RunEventModel = assistantConnection.model<RunEventRecord>(
  "AssistantRunEvent",
  runEventSchema,
);

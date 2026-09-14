import { Schema } from "mongoose";
import { assistantConnection } from "../db.js";

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

runEventSchema.index({ runId: 1, sequence: 1 }, { unique: true });
runEventSchema.index({ conversationId: 1, timestamp: -1 });

export const RunEventModel = assistantConnection.model<RunEventRecord>(
  "AssistantRunEvent",
  runEventSchema,
);

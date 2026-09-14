import mongoose from "@/lib/db";
import type { HydratedDocument, InferSchemaType, Model } from "mongoose";

const summarySchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
    },
    noteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Note",
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  },
);

export type SummaryEntity = InferSchemaType<typeof summarySchema>;
export type SummaryDocument = HydratedDocument<SummaryEntity>;

const SummaryModel: Model<SummaryEntity> = mongoose.model<SummaryEntity>(
  "Summary",
  summarySchema,
  "summary",
);

export default SummaryModel;

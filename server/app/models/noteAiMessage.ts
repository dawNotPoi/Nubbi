import mongoose from "@/lib/db";

const noteAiMessageSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NoteAiSession",
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["completed", "streaming", "failed"],
      default: "completed",
    },
    sources: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model(
  "NoteAiMessage",
  noteAiMessageSchema,
  "note_ai_messages",
);

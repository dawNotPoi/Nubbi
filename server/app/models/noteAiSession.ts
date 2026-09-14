import mongoose from "@/lib/db";

const noteAiSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: "New Chat",
      trim: true,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model(
  "NoteAiSession",
  noteAiSessionSchema,
  "note_ai_sessions",
);

import mongoose from "@/lib/db";

const notePurgeTaskSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    rootNoteId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    targetIds: {
      type: [mongoose.Schema.Types.ObjectId],
      required: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    attempts: { type: Number, default: 0 },
    lastError: { type: String, default: null },
  },
  { timestamps: true },
);

notePurgeTaskSchema.index(
  { userId: 1, rootNoteId: 1 },
  { unique: true },
);
notePurgeTaskSchema.index({ userId: 1, targetIds: 1 });

export default mongoose.model(
  "NotePurgeTask",
  notePurgeTaskSchema,
  "note_purge_tasks",
);

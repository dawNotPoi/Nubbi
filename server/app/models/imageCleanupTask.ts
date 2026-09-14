import mongoose from "@/lib/db";

const imageCleanupTaskSchema = new mongoose.Schema(
  {
    ownerId: { type: String, required: true, index: true },
    remotePath: { type: String, required: true },
    remoteSha: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    lastError: { type: String, default: null },
  },
  { timestamps: true },
);

imageCleanupTaskSchema.index(
  { ownerId: 1, remotePath: 1 },
  { unique: true },
);

export default mongoose.model(
  "ImageCleanupTask",
  imageCleanupTaskSchema,
  "image_cleanup_tasks",
);

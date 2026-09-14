import { model, Schema } from "mongoose";

const StorageCleanupTaskSchema = new Schema(
  {
    ownerId: { type: String, required: true },
    storagePath: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    lastError: { type: String },
  },
  { timestamps: true },
);

StorageCleanupTaskSchema.index(
  { ownerId: 1, storagePath: 1 },
  { unique: true },
);
StorageCleanupTaskSchema.index({ updatedAt: 1 });

export const StorageCleanupTask = model(
  "StorageCleanupTask",
  StorageCleanupTaskSchema,
);

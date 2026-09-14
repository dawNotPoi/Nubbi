import mongoose from "@/lib/db";

const { Schema } = mongoose;

const fileFolderStructureLockSchema = new Schema(
  {
    _id: { type: String, required: true },
    owner: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false },
);

fileFolderStructureLockSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 },
);

export default mongoose.models.FileFolderStructureLock ??
  mongoose.model("FileFolderStructureLock", fileFolderStructureLockSchema);

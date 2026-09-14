import mongoose from "@/lib/db";

const { Schema } = mongoose;

const noteStructureLockSchema = new Schema(
  {
    _id: { type: String, required: true },
    owner: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false },
);

noteStructureLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.NoteStructureLock ??
  mongoose.model("NoteStructureLock", noteStructureLockSchema);

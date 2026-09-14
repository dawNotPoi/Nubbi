import mongoose from "@/lib/db";

const { Schema } = mongoose;

const tagSchema = new Schema(
  {
    userId: {
      type: String,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

tagSchema.index({ userId: 1, name: 1 }, { unique: true });

export default mongoose.model("Tag", tagSchema);

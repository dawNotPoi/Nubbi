import mongoose from "@/lib/db";
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
  }
);

export default mongoose.model("Summary", summarySchema, "summary");

import mongoose from "@/lib/db";
const summarySchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Talk", summarySchema, "talk");

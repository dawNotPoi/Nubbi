import mongoose from "@/lib/db";

const aiConfigSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    provider: {
      type: String,
      default: "openai-compatible",
    },
    baseURL: {
      type: String,
      default: "",
    },
    model: {
      type: String,
      default: "",
    },
    apiKeyEncrypted: {
      type: String,
      default: "",
    },
    enableWeb: {
      type: Boolean,
      default: false,
    },
    enableKnowledgeBase: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("AiConfig", aiConfigSchema, "ai_configs");

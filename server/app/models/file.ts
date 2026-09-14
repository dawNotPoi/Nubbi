import mongoose from "@/lib/db";

const chunkSchema = new mongoose.Schema({
  index: { type: Number, required: true },
  path: { type: String, required: true },
  size: { type: Number, required: true },
  hash: { type: String, required: true },
});

const fileSchema = new mongoose.Schema(
  {
    //对应账户
    userId: {
      type: String,
      // required: true,
      index: true,
    },
    hash: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    path: {
      type: String,
      required: false, // 改为可选，因为会自动生成
    },
    // size: {
    //   type: Number,
    //   required: true,
    // },
    // chunks: [chunkSchema], // 分片信息暂不存储
  },
  {
    timestamps: true,
  }
);

// 在保存前自动生成 path
fileSchema.pre("save", function (next) {
  // 只在创建新文档时生成 path，更新时不改变
  if (this.isNew && !this.path) {
    // 这里你可以配置你的域名
    const domain = process.env.DOMAIN || "http://localhost:4000";
    this.path = `${domain}/file/${this._id}`;
  }
  next();
});

export default mongoose.model("File", fileSchema, "file");

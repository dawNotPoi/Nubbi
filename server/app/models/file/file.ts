import { model, Schema } from "mongoose";

const FileSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    extension: { type: String },
    mimeType: { type: String },
    size: { type: Number, required: true },
    hash: { type: String, required: true },
    folderId: {
      type: Schema.Types.ObjectId,
      ref: "Folder",
      default: null,
    },
    ownerId: { type: String },
    storagePath: { type: String, required: true },
    uploadId: { type: Schema.Types.ObjectId, ref: "UploadTask" },
    status: {
      type: String,
      enum: ["active", "recycled", "processing"],
      default: "active",
    },
  },
  { timestamps: true },
);

/**
 * 🚀 索引优化
 */
// 1. 用户内秒传：hash 与文件大小共同匹配
FileSchema.index({ hash: 1 });
FileSchema.index(
  { ownerId: 1, hash: 1, size: 1, status: 1 },
);
// 2. 列表查询：用户在特定文件夹下的文件列表 (配合 Folder 的步进式请求)
FileSchema.index({ ownerId: 1, folderId: 1, status: 1, name: 1, _id: 1 });
FileSchema.index({
  ownerId: 1,
  folderId: 1,
  status: 1,
  updatedAt: -1,
  _id: -1,
});
// 3. 统计：用户空间使用量计算
FileSchema.index({ ownerId: 1, size: 1 });
FileSchema.index({ storagePath: 1 });

export const File = model("File", FileSchema);

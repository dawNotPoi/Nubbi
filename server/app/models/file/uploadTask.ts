import { model, Schema } from "mongoose";

const UploadTaskSchema = new Schema(
  {
    fileHash: { type: String, required: true }, // 任务唯一标识
    ownerId: { type: String, required: true }, //用户Id
    fileName: { type: String, required: true }, //文件名
    totalSize: { type: String }, //文件大小
    folderId: { type: Schema.Types.ObjectId, ref: "Folder", default: null }, //目录id
    totalChunks: { type: Number, required: true }, //总分片数量
    // 已上传的分片序号数组，例如 [0, 1, 2, 5]
    uploadedChunks: { type: [Number], default: [] },
    // 存储分片的临时目录，建议使用 /temp/{hash}/
    tempDir: { type: String, required: true },
    // 过期时间：24小时不操作自动删除记录（TTL 索引）
    createdAt: { type: Date, default: Date.now, expires: "24h" },
  },
  { timestamps: true },
);

// 复合唯一索引：防止同一个用户对同一个文件开启多个任务
UploadTaskSchema.index({ ownerId: 1, fileHash: 1 }, { unique: true });

export const UploadTask = model("UploadTask", UploadTaskSchema);

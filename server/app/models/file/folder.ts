import { model, Schema } from "mongoose";

const FolderSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    parentId: { type: Schema.Types.ObjectId, ref: "Folder", default: null },
    path: { type: String, default: "," },
    ownerId: { type: String, index: true },
  },
  { timestamps: true },
);

// 索引优化：方便查询某个文件夹下的子文件夹
FolderSchema.index({ ownerId: 1, parentId: 1, name: 1 });

export const Folder = model("Folder", FolderSchema);

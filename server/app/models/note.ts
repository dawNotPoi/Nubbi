import mongoose from "@/lib/db";

const noteSchema = new mongoose.Schema(
  {
    //对应账户
    userId: {
      type: String,
      // required: true,
      index: true,
    },
    // 名称
    title: {
      type: String,
      default: "New Note",
    },
    //   内容
    content: {
      type: String,
      default: "",
    },
    watched: {
      type: Number,
      default: 0,
    },
    like: {
      type: Number,
      default: 0,
    },
    password: {
      type: String,
      default: null,
    },
    cover: {
      type: String,
      default: "",
    },
    children: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Note",
        default: null,
      },
    ],
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Note",
      default: null,
    },
    date: {
      type: Date,
      default: Date.now(),
    },
    // 新增：自定义属性
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Note", noteSchema);

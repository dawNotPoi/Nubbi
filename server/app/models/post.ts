import mongoose from "@/lib/db";

const postSchema = new mongoose.Schema(
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
      default: "New Post",
    },
    //   内容
    content: {
      type: String,
      default: "",
    },

    //   标签
    tags: {
      type: [String],
      default: [],
    },
    //   摘要
    summary: {
      type: String,
      default: "",
    },
    //   状态
    status: {
      type: String,
      default: "Draft",
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
        ref: "Post",
        default: null,
      },
    ],
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
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

export default mongoose.model("Post", postSchema);

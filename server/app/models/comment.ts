import mongoose from "@/lib/db";

const commentSchema = new mongoose.Schema(
  {
    postId: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comments",
      default: null,
    },
    replies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comments",
      },
    ],
    levelIdArray: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comments",
        default: null,
      },
    ],
    // 区分二级评论还是三级评论
    level: {
      type: Number,
      default: 0,
    },

    userId: String,
    name: String,
    avatar: String,
    website: String,
    email: String,
    ip: String,
  },
  {
    timestamps: true,
  }
);


export default mongoose.model("Comments", commentSchema, "comment");

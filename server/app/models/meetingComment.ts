import mongoose from "@/lib/db";

const meetingCommentSchema = new mongoose.Schema(
  {
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
      index: true,
    },
    roomId: {
      type: String,
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    userId: {
      type: String,
      default: "",
    },
    name: {
      type: String,
      default: "Guest",
    },
    avatar: {
      type: String,
      default: "",
    },
    email: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model(
  "MeetingComment",
  meetingCommentSchema,
  "meetingComment",
);

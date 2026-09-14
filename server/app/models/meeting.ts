import mongoose from "@/lib/db";
import { number } from "zod";
const meetingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    hostId: {
      type: String,
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    status: {
      type: "string",
      enum: ["unreviewd", "approved", "rejected"],
      default: "unreviewd",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Meeting", meetingSchema, "meeting");

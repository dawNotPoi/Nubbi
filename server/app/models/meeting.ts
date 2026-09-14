import mongoose from "@/lib/db";
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
    password: {
      type: String,
      default: "",
    },
    endedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Meeting", meetingSchema, "meeting");

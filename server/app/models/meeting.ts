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
    status: {
      type: String,
      enum: ["unreviewd", "approved", "rejected"],
      default: "approved",
    },
  },
  {
    timestamps: true,
  }
);

meetingSchema.index({ createdAt: -1, _id: -1 });
meetingSchema.index({ status: 1, createdAt: -1, _id: -1 });

export default mongoose.model("Meeting", meetingSchema, "meeting");

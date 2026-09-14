export interface MeetingType {
    _id: string;
    title: string;
    hostId: string;
    createdAt: Date;
    duration: number;
    status: MeetingStatus
}

export type MeetingStatus = "unreviewd" | "approved" | "rejected";

// {
//     title: {
//       type: String,
//       required: true,
//     },
//     hostId: {
//       type: String,
//       required: true,
//     },
//     startTime: {
//       type: Date,
//       required: true,
//     },
//     duration: {
//       type: Number,
//       required: true,
//     },
//     status: {
//       type: "string",
//       enum: ["unreviewd", "approved", "rejected"],
//       default: "unreviewd",
//     },
//   },
//   {
//     timestamps: true,
//   }
import comment from '@/models/comment';
import meeting from "@/models/meeting";
import post from "@/models/post";
import express from "express";
import { successResponse } from './utils';
const router = express.Router();
// router.get("/info", async (req, res) => {
//     const meetingCount = await meeting.countDocuments();
//     const noteCount = await post.countDocuments();
//     const commentCount = await comment.countDocuments();
//     const likeCount = await post.aggregate([
//         {
//             $project: {
//                 // 将缺失的字段设为0，确保为数值类型
//                 like: { $ifNull: ["$like", 0] }
//             }
//         },
//         {
//             $group: {
//                 _id: null,
//                 count: { $sum: "$like" }
//             }
//         }
//     ])
//     const watchedCount = await post.aggregate([
//         {
//             $project: {
//                 // 将缺失的字段设为0，确保为数值类型
//                 watched: { $ifNull: ["$watched", 0] }
//             }
//         },
//         {
//             $group: {
//                 _id: null,
//                 count: { $sum: "$watched" }
//             }
//         }

//     ])
//     successResponse(res, { meetingCount, noteCount, commentCount, likeCount: likeCount[0].count, watchedCount: watchedCount[0].count, time: new Date().toLocaleString() });
// });

export default router;

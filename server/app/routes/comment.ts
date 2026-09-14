import { asyncHandler } from "@/middleware/common";
import comment from "@/models/comment";
import express from "express";
import { successResponse } from "./utils";
import { reply } from "@/control/comment";
const router = express.Router();
router.get(
    "/findAllComment",
    asyncHandler(async (req, res) => {
        const result = await comment.find().sort({ createdAt: -1 });
        successResponse(res, result);
    })
)

router.get(
    "/delete",
    asyncHandler(async (req, res) => {
        const { id } = req.query;
        const result = await comment.deleteOne({ _id: id });
        successResponse(res, result);
    })
)

router.get(
    "/findPostComment",
    asyncHandler(async (req, res) => {
        const { postId } = req.query;
        const result = await comment.find({ postId: postId }).sort({ createdAt: -1 });
        successResponse(res, result);
    }))

router.post(
    "/reply",
    asyncHandler(async (req, res) => {
        const params = req.body;
        const result = await reply(params)
        successResponse(res, result);
    })
)


export default router;
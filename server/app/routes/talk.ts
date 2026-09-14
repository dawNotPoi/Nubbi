import express from "express";
import { asyncHandler } from "../middleware/common";
import talk from "../models/talk";
import { successResponse } from "./utils";
const router = express.Router();
router.post(
  "/create",
  asyncHandler(async (req, res) => {
    const { content } = req.body;
    if (!content) {
      const error = new Error("内容不能为空");
      error.status = 400;
      throw new Error("内容不能为空");
    }
    const result = await talk.create({ content });
    successResponse(res, result);
  })
);

router.post(
  "/findByPage",
  asyncHandler(async (req, res) => {
    const { page = 1, pageSize = 10, ...query } = req.body;
    const skip = (page - 1) * pageSize;
    const total = await talk.countDocuments(query);
    const result = await talk
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize);

    successResponse(res, {
      list: result,
      pagination: {
        total,
        page: Number(page),
        pageSize: Number(pageSize),
        totalPages: Math.ceil(total / pageSize),
      },
    });
  })
);

router.delete(
  "/delete/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!id) {
      const error = new Error("ID不能为空");
      error.status = 400;
      throw error;
    }
    const result = await talk.findByIdAndDelete(id);
    if (!result) {
      const error = new Error("未找到对应的记录");
      error.status = 404;
      throw error;
    }
    successResponse(res, result);
  })
);

export default router;

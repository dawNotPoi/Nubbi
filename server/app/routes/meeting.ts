import express from "express";
import { asyncHandler } from "../middleware/common";
import meeting from "../models/meeting";
import { successResponse } from "./utils";
import log from "@/common/chalk";
import { query } from "winston";
const router = express.Router();
router.post(
  "/create",
  asyncHandler(async (req, res) => {
    const { title, startTime, duration, hostId } = req.body;
    const result = await meeting.create({ title, startTime, duration, hostId });
    successResponse(res, result);
  })
);


router.get(
  "/findMyMeeting",
  asyncHandler(async (req, res) => {
    const { hostId } = req.query;
    const result = await meeting.find({
      hostId: hostId
    })
    successResponse(res, result);
  })
)

router.post(
  "/findByPage",
  asyncHandler(async (req, res) => {
    const { page = 1, pageSize = 10, ...query } = req.body;
    const skip = (page - 1) * pageSize;
    const total = await meeting.countDocuments(query);
    const result = await meeting
      .find({
        ...query,
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize);

    successResponse(res, {
      data: result,
      pagination: {
        total,
        page: Number(page),
        pageSize: Number(pageSize),
        totalPages: Math.ceil(total / pageSize),
      },
    });
  })
);


router.post(
  "/vetMeeting",
  asyncHandler(async (req, res) => {
    const { id, status } = req.body
    try {
      const result = await meeting.updateOne({ _id: id }, { status })
      successResponse(res, {
        data: result
      })
    } catch (error) {
      throw error;
    }
  })
)


router.post(
  "/findMyMeeting",
  asyncHandler(async (req, res) => {
    const { page = 1, pageSize = 10, ...query } = req.body;
    const skip = (page - 1) * pageSize;
    const total = await meeting.countDocuments(query);
    const result = await meeting
      .find({
        ...query,
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize);

    successResponse(res, {
      data: result,
      pagination: {
        total,
        page: Number(page),
        pageSize: Number(pageSize),
        totalPages: Math.ceil(total / pageSize),
      },
    });
  })
);

router.get(
  "/findAllMeeting",
  asyncHandler(async (req, res) => {
    const result = await meeting.find().sort({ createdAt: -1 });
    successResponse(res, result);
  })
)



router.delete(
  "/delete",
  asyncHandler(async (req, res) => {
    const { _id } = req.query;
    if (!_id) {
      const error = new Error("ID不能为空");

      throw error;
    }
    const result = await meeting.findByIdAndDelete(_id);
    if (!result) {
      const error = new Error("未找到对应的记录");

      throw error;
    }
    successResponse(res, result);
  })
);

router.get(
  "/findById",
  asyncHandler(async (req, res) => {
    const { id } = req.query;
    const result = await meeting.findById(id);
    successResponse(res, result);
  })
)

export default router;

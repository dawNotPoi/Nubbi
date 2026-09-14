// 业务路由同时接受 session/JWT 与长期 API token
import { paginationQuerySchema } from "@/common/pagination";
import {
  listMeetingsController,
  listMeetingsLegacyController,
} from "@/controller/meeting-list";
import { requireAuthWithApiKey as requireAuth } from "@/middleware/session";
import {
  autoEndExpiredMeeting,
  autoEndExpiredMeetings,
} from "@/services/meeting/lifecycle";
import express from "express";
import { asyncHandler } from "../middleware/common";
import { validate, validateQuery } from "../middleware/validator";
import meetingComment from "../models/meetingComment";
import meeting from "../models/meeting";
import { serializeMeetingListItem } from "../services/meeting/listDto";
import {
  legacyMeetingPageSchema,
  vetMeetingSchema,
} from "../services/meeting/schemas";
import { successResponse } from "./utils";
const router = express.Router();

router.post(
  "/create",
  requireAuth,
  asyncHandler(async (req, res) => {
    const hostId = req.user!.id;
    const { title, startTime, duration, password } = req.body;
    const result = await meeting.create({
      title,
      startTime,
      duration,
      hostId,
      password: password?.trim?.() || "",
    });
    successResponse(res, result);
  })
);

router.get(
  "/findMyMeeting",
  requireAuth,
  asyncHandler(async (req, res) => {
    const hostId = req.user!.id;
    const result = await meeting.find({
      hostId: hostId,
    });
    const normalized = await autoEndExpiredMeetings(result);
    successResponse(res, normalized.map(serializeMeetingListItem));
  })
);

router.get(
  "/list",
  requireAuth,
  validateQuery(paginationQuerySchema),
  asyncHandler(listMeetingsController),
);

router.post(
  "/findByPage",
  requireAuth,
  validate(legacyMeetingPageSchema),
  asyncHandler(listMeetingsLegacyController),
);

router.post(
  "/vetMeeting",
  requireAuth,
  validate(vetMeetingSchema),
  asyncHandler(async (req, res) => {
    const { id, status } = req.body;
    try {
      const result = await meeting.updateOne({ _id: id }, { status });
      successResponse(res, {
        data: result,
      });
    } catch (error) {
      throw error;
    }
  })
);

router.get(
  "/findAllMeeting",
  asyncHandler(async (req, res) => {
    const result = await meeting.find().sort({ createdAt: -1 });
    const normalized = await autoEndExpiredMeetings(result);
    successResponse(res, normalized.map(serializeMeetingListItem));
  })
);

router.delete(
  "/delete",
  requireAuth,
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
    await meetingComment.deleteMany({ roomId: String(_id) });
    successResponse(res, serializeMeetingListItem(result));
  })
);

router.get(
  "/findById",
  asyncHandler(async (req, res) => {
    const { id } = req.query;
    const result = await meeting.findById(id);
    if (!result) {
      successResponse(res, null);
      return;
    }
    const normalized = await autoEndExpiredMeeting(result);
    successResponse(res, serializeMeetingListItem(normalized));
  })
);

router.get(
  "/comments",
  asyncHandler(async (req, res) => {
    const { id } = req.query;
    const result = await meetingComment.find({ roomId: String(id || "") }).sort({
      createdAt: 1,
    });
    successResponse(res, result);
  })
);

router.post(
  "/validateAccess",
  asyncHandler(async (req, res) => {
    const { id, password = "" } = req.body;
    const result = await autoEndExpiredMeeting(await meeting.findById(id));

    if (!result) {
      successResponse(res, {
        passed: false,
        reason: "NOT_FOUND",
      });
      return;
    }

    const meetingPassword = result.password || "";
    const passed = !meetingPassword || meetingPassword === password;

    successResponse(res, {
      passed,
      reason: passed ? "OK" : "INVALID_PASSWORD",
    });
  })
);

export default router;

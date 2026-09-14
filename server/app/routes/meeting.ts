import requireAuth from "@/middleware/session";
import express from "express";
import { asyncHandler } from "../middleware/common";
import meetingComment from "../models/meetingComment";
import meeting from "../models/meeting";
import { successResponse } from "./utils";
const router = express.Router();

const getMeetingEndTimestamp = (item: {
  startTime?: string | number | Date | null;
  createdAt?: string | number | Date | null;
  duration?: number | null;
}) => {
  const startTime = item.startTime || item.createdAt;
  if (!startTime || !item.duration) return null;

  const start = new Date(startTime).getTime();
  if (Number.isNaN(start)) return null;

  return start + item.duration * 60 * 1000;
};

const isMeetingExpired = (item: {
  startTime?: string | number | Date | null;
  createdAt?: string | number | Date | null;
  duration?: number | null;
  endedAt?: string | number | Date | null;
}) => {
  if (item.endedAt) return false;

  const endTimestamp = getMeetingEndTimestamp(item);
  return endTimestamp !== null && Date.now() >= endTimestamp;
};

const autoEndExpiredMeetings = async <T extends Array<any>>(meetings: T) => {
  const now = new Date();
  const expiredIds = meetings
    .filter((item) => isMeetingExpired(item))
    .map((item) => String(item._id));

  if (expiredIds.length > 0) {
    await meeting.updateMany(
      {
        _id: { $in: expiredIds },
        endedAt: null,
      },
      {
        $set: {
          endedAt: now,
        },
      },
    );
  }

  return meetings.map((item) => {
    if (!expiredIds.includes(String(item._id))) {
      return item;
    }

    const plain =
      typeof item.toObject === "function" ? item.toObject() : { ...item };

    return {
      ...plain,
      endedAt: plain.endedAt || now,
    };
  }) as T;
};

const autoEndExpiredMeeting = async (item: any) => {
  if (!item || !isMeetingExpired(item)) {
    return item;
  }

  const now = new Date();
  await meeting.updateOne(
    {
      _id: item._id,
      endedAt: null,
    },
    {
      $set: {
        endedAt: now,
      },
    },
  );

  const plain = typeof item.toObject === "function" ? item.toObject() : { ...item };
  return {
    ...plain,
    endedAt: plain.endedAt || now,
  };
};

router.post(
  "/create",
  requireAuth,
  asyncHandler(async (req, res) => {
    const hostId = (req as any).user.id;
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
    const hostId = (req as any).user.id;
    const result = await meeting.find({
      hostId: hostId,
    });
    successResponse(res, await autoEndExpiredMeetings(result));
  })
);

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
      data: await autoEndExpiredMeetings(result),
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
    successResponse(res, await autoEndExpiredMeetings(result));
  })
);

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
    await meetingComment.deleteMany({ roomId: String(_id) });
    successResponse(res, result);
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
    successResponse(res, await autoEndExpiredMeeting(result));
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

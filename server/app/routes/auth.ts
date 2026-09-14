import { auth } from "@/lib/auth";
import { consumeEmailVerificationCode } from "@/lib/emailVerification";
import { consumePasswordResetCode } from "@/lib/passwordReset";
import express from "express";
import { asyncHandler } from "../middleware/common";
import { successResponse } from "./utils";

const router = express.Router();

router.post(
  "/email/verify-by-code",
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();
    const code = String(req.body?.code || "").trim();

    if (!email) {
      return res.status(400).json({
        code: 0,
        message: "邮箱不能为空",
        data: null,
      });
    }

    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({
        code: 0,
        message: "请输入 6 位数字验证码",
        data: null,
      });
    }

    const token = await consumeEmailVerificationCode(email, code);

    if (!token) {
      return res.status(400).json({
        code: 0,
        message: "验证码无效或已过期",
        data: null,
      });
    }

    await auth.api.verifyEmail({
      query: {
        token,
      },
      headers: req.headers as HeadersInit,
    });

    successResponse(res, null, "邮箱验证成功");
  }),
);

router.post(
  "/email/resend-verification-code",
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();

    if (!email) {
      return res.status(400).json({
        code: 0,
        message: "邮箱不能为空",
        data: null,
      });
    }

    await auth.api.sendVerificationEmail({
      body: {
        email,
      },
      headers: req.headers as HeadersInit,
    });

    successResponse(res, null, "验证码已发送");
  }),
);

router.post(
  "/password/reset-by-code",
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();
    const code = String(req.body?.code || "").trim();
    const newPassword = String(req.body?.newPassword || "");

    if (!email) {
      return res.status(400).json({
        code: 0,
        message: "邮箱不能为空",
        data: null,
      });
    }

    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({
        code: 0,
        message: "请输入 6 位数字验证码",
        data: null,
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        code: 0,
        message: "新密码至少需要 6 位",
        data: null,
      });
    }

    const token = await consumePasswordResetCode(email, code);

    if (!token) {
      return res.status(400).json({
        code: 0,
        message: "验证码无效或已过期",
        data: null,
      });
    }

    await auth.api.resetPassword({
      body: {
        token,
        newPassword,
      },
      headers: req.headers as HeadersInit,
    });

    successResponse(res, null, "密码重置成功");
  }),
);

export default router;

import {
  auth,
  getUser,
  signUpVerifiedEmailWithPassword,
} from "@/lib/auth";
import {
  sendAccountDeletionVerificationEmail,
  sendRegisterVerificationEmail,
} from "@/lib/email";
import {
  ACCOUNT_DELETION_COOLDOWN_SECONDS,
  ACCOUNT_DELETION_EXPIRES_IN_SECONDS,
  clearAccountDeletionCodes,
  consumeAccountDeletionCode,
  createAccountDeletionCode,
} from "@/lib/accountDeletionVerification";
import { db } from "@/lib/db";
import { consumeEmailVerificationCode } from "@/lib/emailVerification";
import {
  consumePasswordResetCode,
  getPasswordResetRemainingSeconds,
  PASSWORD_RESET_COOLDOWN_SECONDS,
  PASSWORD_RESET_EXPIRES_IN_SECONDS,
} from "@/lib/passwordReset";
import {
  clearRegisterVerificationCodes,
  consumeRegisterVerificationCode,
  createRegisterVerificationCode,
  REGISTER_VERIFICATION_COOLDOWN_SECONDS,
  REGISTER_VERIFICATION_EXPIRES_IN_SECONDS,
} from "@/lib/registerVerification";
import requireAuth from "@/middleware/session";
import Note from "@/models/note";
import { File } from "@/models/file/file";
import { Folder } from "@/models/file/folder";
import { UploadTask } from "@/models/file/uploadTask";
import MeetingComment from "@/models/meetingComment";
import express from "express";
import fse from "fs-extra";
import { ObjectId } from "mongodb";
import { asyncHandler } from "../middleware/common";
import { successResponse } from "./utils";

const router = express.Router();

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernamePattern = /^[a-zA-Z0-9_]+$/;
type AuthUserDocument = {
  _id?: ObjectId | string;
  id?: string;
};
const emailDomainCorrections: Record<string, string> = {
  "foxmai.com": "foxmail.com",
  "gamil.com": "gmail.com",
  "gmail.con": "gmail.com",
  "hotmial.com": "hotmail.com",
  "outlok.com": "outlook.com",
  "qq.con": "qq.com",
};

const getEmailDomainCorrection = (email: string) => {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain ? emailDomainCorrections[domain] : undefined;
};

const validateEmailAddress = (email: string) => {
  if (!emailPattern.test(email)) {
    return "请输入有效的邮箱地址";
  }

  const correctedDomain = getEmailDomainCorrection(email);
  if (correctedDomain) {
    return `邮箱域名是否应为 ${correctedDomain}？`;
  }

  return null;
};

const getExistingEmailData = (user: unknown) => {
  const emailVerified = Boolean(
    (user as { emailVerified?: boolean } | null)?.emailVerified,
  );

  return {
    emailRegistered: true,
    emailVerified,
  };
};

const removeOrphanedStorageFiles = async (storagePaths: string[]) => {
  const uniquePaths = [...new Set(storagePaths.filter(Boolean))];

  await Promise.all(
    uniquePaths.map(async (storagePath) => {
      const remainingReferences = await File.countDocuments({ storagePath });

      if (remainingReferences > 0) {
        return;
      }

      if (await fse.pathExists(storagePath)) {
        await fse.remove(storagePath);
      }
    }),
  );
};

const deleteUserAccountData = async ({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) => {
  const mongoDb = await db;

  if (!mongoDb) {
    throw new Error("Database connection is not ready");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const userFiles = await File.find({ ownerId: userId })
    .select("storagePath")
    .lean();
  const storagePaths = userFiles.map((file) => file.storagePath);

  await Promise.all([
    Note.deleteMany({ userId }),
    Folder.deleteMany({ ownerId: userId }),
    File.deleteMany({ ownerId: userId }),
    UploadTask.deleteMany({ ownerId: userId }),
    MeetingComment.deleteMany({ userId }),
    mongoDb.collection("session").deleteMany({ userId }),
    mongoDb.collection("account").deleteMany({ userId }),
    mongoDb.collection("verification").deleteMany({ identifier: normalizedEmail }),
    mongoDb.collection("email_verification_codes").deleteMany({
      email: normalizedEmail,
    }),
    mongoDb.collection("password_reset_codes").deleteMany({
      email: normalizedEmail,
    }),
    mongoDb.collection("register_verification_codes").deleteMany({
      email: normalizedEmail,
    }),
    mongoDb.collection("account_deletion_codes").deleteMany({ userId }),
  ]);

  const userIdObject = ObjectId.isValid(userId) ? new ObjectId(userId) : null;
  const userDeleteFilters: Array<Partial<AuthUserDocument>> = [
    { id: userId },
    { _id: userId },
    ...(userIdObject ? [{ _id: userIdObject }] : []),
  ];

  await mongoDb.collection<AuthUserDocument>("user").deleteOne({
    $or: userDeleteFilters,
  });
  await removeOrphanedStorageFiles(storagePaths);
};

const findAuthUserByEmail = async (
  email: string,
  opts?: { includeAccounts?: boolean },
) => {
  const authContext = await auth.$context;
  return authContext.internalAdapter.findUserByEmail(email, {
    includeAccounts: opts?.includeAccounts ?? false,
  });
};

const hasCredentialAccount = (
  existing: Awaited<ReturnType<typeof findAuthUserByEmail>>,
) =>
  existing?.accounts?.some(
    (a) => (a as { providerId?: string }).providerId === "credential",
  );

const errorResponse = (
  res: express.Response,
  status: number,
  message: string,
  data: unknown = null,
) =>
  res.status(status).json({
    code: 0,
    message,
    data,
  });

router.post(
  "/register/send-code",
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();

    if (!email) {
      return errorResponse(res, 400, "邮箱不能为空");
    }

    const emailError = validateEmailAddress(email);
    if (emailError) {
      return errorResponse(res, 400, emailError);
    }

    const existingUser = await findAuthUserByEmail(email, {
      includeAccounts: true,
    });
    if (existingUser?.user) {
      const existingEmailData = getExistingEmailData(existingUser.user);

      if (hasCredentialAccount(existingUser)) {
        return errorResponse(
          res,
          409,
          existingEmailData.emailVerified
            ? "邮箱已注册，请直接登录"
            : "邮箱已注册但尚未验证，请完成邮箱验证",
          existingEmailData,
        );
      }

      return errorResponse(
        res,
        409,
        "该邮箱已通过第三方登录注册，请使用对应的第三方登录方式，或通过「忘记密码」设置密码后登录",
        existingEmailData,
      );
    }

    const issueResult = await createRegisterVerificationCode(email);
    if (!issueResult.success) {
      return errorResponse(res, 429, "验证码发送过于频繁，请稍后再试", {
        remainingSeconds: issueResult.remainingSeconds,
      });
    }

    const emailResult = await sendRegisterVerificationEmail(
      email,
      issueResult.code,
    );

    if (!emailResult.success) {
      await clearRegisterVerificationCodes(email);
      return errorResponse(res, 500, "验证码发送失败，请稍后重试");
    }

    successResponse(
      res,
      {
        cooldownSeconds: REGISTER_VERIFICATION_COOLDOWN_SECONDS,
        expiresInSeconds: REGISTER_VERIFICATION_EXPIRES_IN_SECONDS,
      },
      "验证码已发送",
    );
  }),
);

router.post(
  "/register/email",
  asyncHandler(async (req, res) => {
    const username = String(req.body?.username || "").trim();
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body?.password || "");
    const code = String(req.body?.code || "").trim();

    if (!username) {
      return errorResponse(res, 400, "请输入用户名");
    }

    if (username.length < 3) {
      return errorResponse(res, 400, "用户名至少 3 位");
    }

    if (username.length > 20) {
      return errorResponse(res, 400, "用户名最多 20 位");
    }

    if (!usernamePattern.test(username)) {
      return errorResponse(res, 400, "用户名只能包含字母、数字和下划线");
    }

    if (!email) {
      return errorResponse(res, 400, "邮箱不能为空");
    }

    const emailError = validateEmailAddress(email);
    if (emailError) {
      return errorResponse(res, 400, emailError);
    }

    if (!/^\d{6}$/.test(code)) {
      return errorResponse(res, 400, "请输入 6 位数字验证码");
    }

    if (password.length < 6) {
      return errorResponse(res, 400, "密码至少 6 位");
    }

    const existingUser = await findAuthUserByEmail(email, {
      includeAccounts: true,
    });
    if (existingUser?.user) {
      const existingEmailData = getExistingEmailData(existingUser.user);

      if (hasCredentialAccount(existingUser)) {
        return errorResponse(
          res,
          409,
          existingEmailData.emailVerified
            ? "邮箱已注册，请直接登录"
            : "邮箱已注册但尚未验证，请完成邮箱验证",
          existingEmailData,
        );
      }

      return errorResponse(
        res,
        409,
        "该邮箱已通过第三方登录注册，请使用对应的第三方登录方式，或通过「忘记密码」设置密码后登录",
        existingEmailData,
      );
    }

    const codeMatched = await consumeRegisterVerificationCode(email, code);
    if (!codeMatched) {
      return errorResponse(res, 400, "验证码无效或已过期");
    }

    const result = await signUpVerifiedEmailWithPassword({
      email,
      password,
      name: username,
      headers: req.headers as HeadersInit,
    });

    await clearRegisterVerificationCodes(email);
    successResponse(res, result, "注册成功");
  }),
);

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
  "/account/delete/send-code",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await getUser(req);
    const email = user.email?.trim().toLowerCase();

    if (!email) {
      return errorResponse(res, 400, "当前账号没有可用邮箱，无法发送验证码");
    }

    const issueResult = await createAccountDeletionCode({
      userId: user.id,
      email,
    });

    if (!issueResult.success) {
      return errorResponse(res, 429, "验证码发送过于频繁，请稍后再试", {
        remainingSeconds: issueResult.remainingSeconds,
      });
    }

    const emailResult = await sendAccountDeletionVerificationEmail(
      email,
      issueResult.code,
    );

    if (!emailResult.success) {
      await clearAccountDeletionCodes(user.id);
      return errorResponse(res, 500, "验证码发送失败，请稍后重试");
    }

    successResponse(
      res,
      {
        cooldownSeconds: ACCOUNT_DELETION_COOLDOWN_SECONDS,
        expiresInSeconds: ACCOUNT_DELETION_EXPIRES_IN_SECONDS,
        email,
      },
      "验证码已发送",
    );
  }),
);

router.post(
  "/account/delete/confirm",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await getUser(req);
    const email = user.email?.trim().toLowerCase();
    const code = String(req.body?.code || "").trim();
    const confirmed = req.body?.confirmed === true;

    if (!email) {
      return errorResponse(res, 400, "当前账号没有可用邮箱，无法注销账号");
    }

    if (!confirmed) {
      return errorResponse(res, 400, "请先确认注销账号操作");
    }

    if (!/^\d{6}$/.test(code)) {
      return errorResponse(res, 400, "请输入 6 位数字验证码");
    }

    const codeMatched = await consumeAccountDeletionCode({
      userId: user.id,
      email,
      code,
    });

    if (!codeMatched) {
      return errorResponse(res, 400, "验证码无效或已过期");
    }

    await deleteUserAccountData({
      userId: user.id,
      email,
    });

    successResponse(res, null, "账号已注销");
  }),
);

router.post(
  "/password/reset/send-code",
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();

    if (!email) {
      return errorResponse(res, 400, "邮箱不能为空");
    }

    const emailError = validateEmailAddress(email);
    if (emailError) {
      return errorResponse(res, 400, emailError);
    }

    const remainingSeconds = await getPasswordResetRemainingSeconds(email);
    if (remainingSeconds > 0) {
      return errorResponse(res, 429, "验证码发送过于频繁，请稍后再试", {
        remainingSeconds,
      });
    }

    await auth.api.requestPasswordReset({
      body: {
        email,
        redirectTo: `${req.protocol}://${req.get("host")}/reset-password`,
      },
      headers: req.headers as HeadersInit,
    });

    successResponse(
      res,
      {
        cooldownSeconds: PASSWORD_RESET_COOLDOWN_SECONDS,
        expiresInSeconds: PASSWORD_RESET_EXPIRES_IN_SECONDS,
      },
      "验证码已发送",
    );
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

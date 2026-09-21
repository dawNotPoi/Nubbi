import {
  confirmAccountDeletion,
  sendAccountDeletionCode,
} from "@/controller/auth/account-deletion";
import { createMcpApiKey } from "@/controller/auth/api-key";
import {
  resendEmailVerificationCode,
  verifyEmailByCode,
} from "@/controller/auth/email-verification";
import {
  resetPasswordByCode,
  sendPasswordResetCode,
} from "@/controller/auth/password-reset";
import { updateUserAvatar } from "@/controller/auth/profile";
import {
  registerEmail,
  sendRegisterCode,
} from "@/controller/auth/registration";
import {
  requireAuthenticatedUser,
  type AuthenticatedUser,
} from "@/lib/authUser";
import { toWebHeaders } from "@/lib/requestHeaders";
import { skipAccountMutationTracking } from "@/middleware/account-mutation";
import requireAuth from "@/middleware/session";
import { requireTrustedOrigin } from "@/middleware/trustedOrigin";
import {
  createJsonRouteRegistrar,
  createPublicJsonRouteRegistrar,
} from "@/routes/infrastructure/json-route-registrar";
import express from "express";
import {
  accountDeletionBodySchema,
  avatarBodySchema,
  emailBodySchema,
  mcpApiKeyBodySchema,
  passwordResetBodySchema,
  registerEmailBodySchema,
  verificationCodeBodySchema,
} from "./schemas";
import { limitAuthCodeRequests } from "./code-rate-limit";

const router = express.Router();
router.use(
  [
    "/register/send-code",
    "/email/resend-verification-code",
    "/password/reset/send-code",
  ],
  limitAuthCodeRequests,
);
const publicRoutes = createPublicJsonRouteRegistrar<
  "register" | "verify" | "reset"
>(router);
const accountRoutes = createJsonRouteRegistrar<
  "account" | "profile",
  AuthenticatedUser
>(router, {
  authorize: () => requireAuth,
  resolveActor: requireAuthenticatedUser,
});

publicRoutes.post("/register/send-code", {
  action: "register",
  body: emailBodySchema,
  message: "验证码已发送",
  handler: ({ body }) => sendRegisterCode(body.email),
});

publicRoutes.post("/register/email", {
  action: "register",
  body: registerEmailBodySchema,
  message: "注册成功",
  handler: ({ body, headers }) =>
    registerEmail(body, toWebHeaders(headers)),
});

publicRoutes.post("/email/verify-by-code", {
  action: "verify",
  body: verificationCodeBodySchema,
  message: "邮箱验证成功",
  handler: ({ body, headers }) =>
    verifyEmailByCode(
      body.email,
      body.code,
      toWebHeaders(headers),
    ),
});

publicRoutes.post("/email/resend-verification-code", {
  action: "verify",
  body: emailBodySchema,
  message: "验证码已发送",
  handler: ({ body, headers }) =>
    resendEmailVerificationCode(body.email, toWebHeaders(headers)),
});

publicRoutes.post("/password/reset/send-code", {
  action: "reset",
  body: emailBodySchema,
  message: "验证码已发送",
  handler: ({ body, headers }) =>
    sendPasswordResetCode(
      body.email,
      toWebHeaders(headers),
    ),
});

publicRoutes.post("/password/reset-by-code", {
  action: "reset",
  body: passwordResetBodySchema,
  message: "密码重置成功",
  handler: ({ body, headers }) =>
    resetPasswordByCode(body, toWebHeaders(headers)),
});

accountRoutes.post("/account/delete/send-code", {
  action: "account",
  message: "验证码已发送",
  handler: ({ actor }) => sendAccountDeletionCode(actor),
});

accountRoutes.post("/account/delete/confirm", {
  action: "account",
  beforeAuthorization: [skipAccountMutationTracking],
  body: accountDeletionBodySchema,
  message: "账号已注销",
  handler: ({ actor, body }) =>
    confirmAccountDeletion(actor, body.code, body.confirmed),
});

accountRoutes.post("/avatar/update", {
  action: "profile",
  body: avatarBodySchema,
  message: "头像更新成功",
  handler: ({ actor, body }) => updateUserAvatar(actor.id, body.imageUrl),
});

const trustedRouter = express.Router();
const trustedRoutes = createJsonRouteRegistrar<
  "api-key",
  AuthenticatedUser
>(trustedRouter, {
  authorize: () => requireAuth,
  resolveActor: requireAuthenticatedUser,
});

trustedRoutes.post("/mcp", {
  action: "api-key",
  body: mcpApiKeyBodySchema,
  message: "MCP Agent API key created",
  handler: ({ actor, body }) => createMcpApiKey(actor.id, body),
});

router.use("/api-key", requireTrustedOrigin, trustedRouter);

export default router;

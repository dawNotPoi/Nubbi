import { httpError } from "@/common/http-error";
import { auth } from "@/lib/auth";
import env from "@/lib/env";
import {
  consumePasswordResetCode,
  createPasswordResetAttempt,
  getPasswordResetRemainingSeconds,
  PASSWORD_RESET_COOLDOWN_SECONDS,
  PASSWORD_RESET_EXPIRES_IN_SECONDS,
} from "@/lib/passwordReset";

/** 发送密码重置验证码：遵守冷却时间，请求 Better Auth 发送重置邮件 */
export const sendPasswordResetCode = async (
  email: string,
  headers: HeadersInit,
): Promise<{
  cooldownSeconds: number;
  expiresInSeconds: number;
}> => {
  const remainingSeconds = await getPasswordResetRemainingSeconds(email);
  if (remainingSeconds > 0) {
    throw httpError(429, "验证码发送过于频繁，请稍后再试", {
      remainingSeconds,
    });
  }

  // 占位记录让不存在的邮箱也遵守冷却时间。
  await createPasswordResetAttempt(email);
  await auth.api.requestPasswordReset({
    body: {
      email,
      redirectTo: new URL("/reset-password", env.CLIENT_URL).toString(),
    },
    headers,
  });

  return {
    cooldownSeconds: PASSWORD_RESET_COOLDOWN_SECONDS,
    expiresInSeconds: PASSWORD_RESET_EXPIRES_IN_SECONDS,
  };
};

/** 重置密码的输入参数 */
export type ResetPasswordInput = {
  email: string;
  code: string;
  newPassword: string;
};

/** 通过验证码重置密码：校验验证码后调用 Better Auth */
export const resetPasswordByCode = async (
  input: ResetPasswordInput,
  headers: HeadersInit,
): Promise<null> => {
  const token = await consumePasswordResetCode(input.email, input.code);
  if (!token) {
    throw httpError(400, "验证码无效或已过期");
  }

  await auth.api.resetPassword({
    body: {
      token,
      newPassword: input.newPassword,
    },
    headers,
  });
  return null;
};

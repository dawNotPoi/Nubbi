import { httpError } from "@/common/http-error";
import { auth } from "@/lib/auth";
import {
  consumeEmailVerificationCode,
  createEmailVerificationAttempt,
  EMAIL_VERIFICATION_COOLDOWN_SECONDS,
  getEmailVerificationRemainingSeconds,
} from "@/lib/emailVerification";

export const verifyEmailByCode = async (
  email: string,
  code: string,
  headers: HeadersInit,
): Promise<null> => {
  const token = await consumeEmailVerificationCode(email, code);
  if (!token) {
    throw httpError(400, "验证码无效或已过期");
  }

  await auth.api.verifyEmail({
    query: { token },
    headers,
  });
  return null;
};

export const resendEmailVerificationCode = async (
  email: string,
  headers: HeadersInit,
): Promise<{ cooldownSeconds: number }> => {
  const remainingSeconds = await getEmailVerificationRemainingSeconds(email);
  if (remainingSeconds > 0) {
    throw httpError(429, "验证码发送过于频繁，请稍后再试", {
      remainingSeconds,
    });
  }

  // 占位记录让不存在的邮箱也遵守冷却时间，避免暴露账号是否存在。
  await createEmailVerificationAttempt(email);
  try {
    await auth.api.sendVerificationEmail({
      body: { email },
      headers,
    });
  } catch {
    // Better Auth 的失败信息不能用于枚举已注册邮箱。
  }

  return { cooldownSeconds: EMAIL_VERIFICATION_COOLDOWN_SECONDS };
};

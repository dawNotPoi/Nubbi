import { httpError } from "@/common/http-error";
import { signUpVerifiedEmailWithPassword } from "@/lib/auth";
import { sendRegisterVerificationEmail } from "@/lib/email";
import {
  clearRegisterVerificationCodes,
  consumeRegisterVerificationCode,
  createRegisterVerificationCode,
  REGISTER_VERIFICATION_COOLDOWN_SECONDS,
  REGISTER_VERIFICATION_EXPIRES_IN_SECONDS,
} from "@/lib/registerVerification";
import { getExistingEmailData } from "@/services/auth/auth-user";

/** 校验邮箱是否可注册：已注册则抛出 409（区分验证状态） */
const assertEmailAvailable = async (email: string): Promise<void> => {
  const existingEmailData = await getExistingEmailData(email);
  if (!existingEmailData) return;

  throw httpError(
    409,
    existingEmailData.emailVerified
      ? "邮箱已注册，请直接登录"
      : "邮箱已注册但尚未验证，请完成邮箱验证",
    existingEmailData,
  );
};

/** 发送注册验证码：检查邮箱可用性、冷却时间，发送成功后返回策略参数 */
export const sendRegisterCode = async (
  email: string,
): Promise<{
  cooldownSeconds: number;
  expiresInSeconds: number;
}> => {
  await assertEmailAvailable(email);

  const issueResult = await createRegisterVerificationCode(email);
  if (!issueResult.success) {
    throw httpError(429, "验证码发送过于频繁，请稍后再试", {
      remainingSeconds: issueResult.remainingSeconds,
    });
  }

  const emailResult = await sendRegisterVerificationEmail(
    email,
    issueResult.code,
  );
  if (!emailResult.success) {
    await clearRegisterVerificationCodes(email);
    throw httpError(500, "验证码发送失败，请稍后重试");
  }

  return {
    cooldownSeconds: REGISTER_VERIFICATION_COOLDOWN_SECONDS,
    expiresInSeconds: REGISTER_VERIFICATION_EXPIRES_IN_SECONDS,
  };
};

/** 注册邮箱输入参数 */
export type RegisterEmailInput = {
  username: string;
  email: string;
  password: string;
  code: string;
};

type RegisterEmailResult = Awaited<
  ReturnType<typeof signUpVerifiedEmailWithPassword>
>;

/** 完成邮箱注册：校验验证码后调用 Better Auth 创建已认证账号 */
export const registerEmail = async (
  input: RegisterEmailInput,
  headers: HeadersInit,
): Promise<RegisterEmailResult> => {
  await assertEmailAvailable(input.email);

  const codeMatched = await consumeRegisterVerificationCode(
    input.email,
    input.code,
  );
  if (!codeMatched) {
    throw httpError(400, "验证码无效或已过期");
  }

  const result = await signUpVerifiedEmailWithPassword({
    email: input.email,
    password: input.password,
    name: input.username,
    headers,
  });

  await clearRegisterVerificationCodes(input.email);
  return result;
};

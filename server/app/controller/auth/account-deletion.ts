import { httpError } from "@/common/http-error";
import {
  ACCOUNT_DELETION_COOLDOWN_SECONDS,
  ACCOUNT_DELETION_EXPIRES_IN_SECONDS,
  clearAccountDeletionCodes,
  consumeAccountDeletionCode,
  createAccountDeletionCode,
} from "@/lib/accountDeletionVerification";
import { sendAccountDeletionVerificationEmail } from "@/lib/email";
import type { AuthenticatedUser } from "@/lib/authUser";
import { deleteUserAccountData } from "@/services/auth/account-deletion";

const requireEmail = (
  user: AuthenticatedUser,
  message: string,
): string => {
  const email = user.email?.trim().toLowerCase();
  if (!email) throw httpError(400, message);
  return email;
};

export const sendAccountDeletionCode = async (
  user: AuthenticatedUser,
): Promise<{
  cooldownSeconds: number;
  expiresInSeconds: number;
  email: string;
}> => {
  const email = requireEmail(
    user,
    "当前账号没有可用邮箱，无法发送验证码",
  );
  const issueResult = await createAccountDeletionCode({
    userId: user.id,
    email,
  });
  if (!issueResult.success) {
    throw httpError(429, "验证码发送过于频繁，请稍后再试", {
      remainingSeconds: issueResult.remainingSeconds,
    });
  }

  const emailResult = await sendAccountDeletionVerificationEmail(
    email,
    issueResult.code,
  );
  if (!emailResult.success) {
    await clearAccountDeletionCodes(user.id);
    throw httpError(500, "验证码发送失败，请稍后重试");
  }

  return {
    cooldownSeconds: ACCOUNT_DELETION_COOLDOWN_SECONDS,
    expiresInSeconds: ACCOUNT_DELETION_EXPIRES_IN_SECONDS,
    email,
  };
};

export const confirmAccountDeletion = async (
  user: AuthenticatedUser,
  code: string,
  confirmed: boolean,
): Promise<null> => {
  const email = requireEmail(user, "当前账号没有可用邮箱，无法注销账号");
  if (!confirmed) {
    throw httpError(400, "请先确认注销账号操作");
  }

  const codeMatched = await consumeAccountDeletionCode({
    userId: user.id,
    email,
    code,
  });
  if (!codeMatched) {
    throw httpError(400, "验证码无效或已过期");
  }

  await deleteUserAccountData({ userId: user.id, email });
  return null;
};

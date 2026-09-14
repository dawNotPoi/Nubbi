import { auth } from "@/lib/auth";

/** 已注册邮箱的查询结果类型 */
export type ExistingEmailData = {
  emailRegistered: true;
  emailVerified: boolean;
};

/** 查询邮箱是否已注册及其验证状态 */
export const getExistingEmailData = async (
  email: string,
): Promise<ExistingEmailData | null> => {
  const authContext = await auth.$context;
  const result = await authContext.internalAdapter.findUserByEmail(email);
  if (!result?.user) return null;

  return {
    emailRegistered: true,
    emailVerified: Boolean(result.user.emailVerified),
  };
};

/** 更新 auth 用户的头像字段 */
export const updateAuthUserAvatar = async (
  userId: string,
  image: string,
): Promise<void> => {
  const authContext = await auth.$context;
  await authContext.internalAdapter.updateUser(userId, { image });
};

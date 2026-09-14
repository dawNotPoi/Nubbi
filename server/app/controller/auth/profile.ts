import { updateAuthUserAvatar } from "@/services/auth/auth-user";

/** 更新用户头像：更新 auth 用户记录的 image 字段并返回新头像 URL */
export const updateUserAvatar = async (
  userId: string,
  imageUrl: string,
): Promise<{ image: string }> => {
  await updateAuthUserAvatar(userId, imageUrl);
  return { image: imageUrl };
};

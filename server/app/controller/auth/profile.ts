import { updateAuthUserAvatar } from "@/services/auth/auth-user";

export const updateUserAvatar = async (
  userId: string,
  imageUrl: string,
): Promise<{ image: string }> => {
  await updateAuthUserAvatar(userId, imageUrl);
  return { image: imageUrl };
};

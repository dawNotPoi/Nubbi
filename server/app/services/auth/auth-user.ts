import { auth } from "@/lib/auth";

export type ExistingEmailData = {
  emailRegistered: true;
  emailVerified: boolean;
};

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

export const updateAuthUserAvatar = async (
  userId: string,
  image: string,
): Promise<void> => {
  const authContext = await auth.$context;
  await authContext.internalAdapter.updateUser(userId, { image });
};

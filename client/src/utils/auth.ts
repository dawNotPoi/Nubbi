import { createAuthClient } from "better-auth/react";
const baseUrl = import.meta.env.VITE_API_URL;
export const authClient = createAuthClient({
  baseURL: baseUrl,
});

export const { signIn, signUp, useSession, getSession } = authClient;

// 邮箱登录
export const signInWithEmail = async (email: string, password: string) => {
  const result = await signIn.email({
    email,
    password,
  });
  return result;
};

// 邮箱注册
export const signUpWithEmail = async (
  email: string,
  password: string,
  name: string
) => {
  try {
    const result = await signUp.email({
      email,
      password,
      name,
      callbackURL: window.location.origin,
    });
    if (result.error) {
      return { success: false, error: result.error };
    } else return { success: true, data: result };
  } catch (error) {
    console.error("注册失败:", error);
    return { success: false, error: "网络错误" };
  }
};

// GitHub 登录
export const signInWithGitHub = async () => {
  try {
    const result = await signIn.social({
      provider: "github",
      callbackURL: window.location.origin,
      errorCallbackURL: window.location.origin + "/login",
    });
    return { success: true, data: result };
  } catch (error) {
    console.error("GitHub 登录失败:", error);
    return { success: false, error };
  }
};

// Google 登录
export const signInWithGoogle = async () => {
  try {
    const result = await signIn.social({
      provider: "google",
      callbackURL: window.location.origin,
      errorCallbackURL: window.location.origin + "/login",
    });
    return { success: true, data: result };
  } catch (error) {
    console.error("Google 登录失败:", error);
    return { success: false, error };
  }
};

// 登出
export const signOut = async () => {
  try {
    await authClient.signOut();
    return { success: true };
  } catch (error) {
    console.error("登出失败:", error);
    return { success: false, error };
  }
};

// 获取当前会话
export const getCurrentSession = async () => {
  try {
    const session = await authClient.getSession();
    return { success: true, session };
  } catch (error) {
    console.error("获取会话失败:", error);
    return { success: false, error };
  }
};

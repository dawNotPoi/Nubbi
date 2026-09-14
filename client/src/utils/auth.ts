import { createAuthClient } from "better-auth/react";
import { useSyncExternalStore } from "react";
import { getApiBaseUrl, getAuthBaseUrl } from "./env";
import { isSafeInternalPath, routes } from "./routes";

const baseUrl = getApiBaseUrl();
const authBaseUrl = getAuthBaseUrl();

type AuthRuntimeState = {
  accessToken: string | null;
  initialized: boolean;
};

type AuthErrorPayload = {
  code?: string;
  message: string;
};

export type AuthActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: AuthErrorPayload;
};

const runtimeListeners = new Set<() => void>();

let runtimeState: AuthRuntimeState = {
  accessToken: null,
  initialized: false,
};

let restorePromise: Promise<boolean> | null = null;
let redirectingToLogin = false;

const emitRuntimeChange = () => {
  runtimeListeners.forEach((listener) => listener());
};

const setRuntimeState = (nextState: Partial<AuthRuntimeState>) => {
  runtimeState = {
    ...runtimeState,
    ...nextState,
  };
  emitRuntimeChange();
};

const subscribeAuthRuntime = (listener: () => void) => {
  runtimeListeners.add(listener);
  return () => runtimeListeners.delete(listener);
};

const getAuthRuntimeSnapshot = () => runtimeState;

export const useAuthRuntime = () =>
  useSyncExternalStore(
    subscribeAuthRuntime,
    getAuthRuntimeSnapshot,
    getAuthRuntimeSnapshot,
  );

export const setAccessToken = (token: string | null) => {
  if (runtimeState.accessToken === token) return;
  setRuntimeState({ accessToken: token });
};

export const getAccessToken = () => runtimeState.accessToken;

export const clearAccessToken = () => {
  setAccessToken(null);
};

const getAuthorizedJsonHeaders = () => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = getAccessToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const extractBearerToken = (headers?: Headers) => {
  const token = headers?.get("set-auth-token");
  if (!token) return null;
  return token;
};

const getErrorCode = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const candidate = error as {
    code?: string;
    error?: {
      code?: string;
    };
  };

  return candidate.error?.code || candidate.code;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (getErrorCode(error) === "EMAIL_NOT_VERIFIED") {
    return "邮箱还没有验证，请先输入邮箱验证码完成验证。";
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (error && typeof error === "object") {
    const candidate = error as {
      message?: string;
      statusText?: string;
      error?: {
        message?: string;
        code?: string;
      };
      code?: string;
    };

    if (candidate.error?.message) return candidate.error.message;
    if (candidate.message) return candidate.message;
    if (candidate.statusText) return candidate.statusText;
  }

  return fallback;
};

const toAuthResult = <T extends { error?: unknown }>(
  result: T,
  fallbackMessage: string,
): AuthActionResult<T> => {
  if (result.error) {
    const payload =
      typeof result.error === "object" && result.error
        ? (result.error as { message?: string; code?: string })
        : undefined;

    return {
      success: false,
      error: {
        code: payload?.code,
        message: getErrorMessage(result.error, fallbackMessage),
      },
    };
  }

  return {
    success: true,
    data: result,
  };
};

export const authClient = createAuthClient({
  baseURL: authBaseUrl,
  fetchOptions: {
    credentials: "include",
    auth: {
      type: "Bearer",
      token: () => getAccessToken() || undefined,
    },
    onSuccess(context) {
      const token = extractBearerToken(context.response.headers);
      if (token) {
        setAccessToken(token);
      }
    },
  },
});

export const { signIn, signUp, useSession, getSession } = authClient;

export const restoreAuthSession = async (): Promise<boolean> => {
  if (restorePromise) {
    return restorePromise;
  }

  restorePromise = (async () => {
    try {
      const session = await authClient.getSession();
      const tokenFromSession =
        (session.data?.session as { token?: string } | undefined)?.token ||
        getAccessToken();

      if (session.data?.user && tokenFromSession) {
        setAccessToken(tokenFromSession);
        return true;
      }

      clearAccessToken();
      return false;
    } catch {
      clearAccessToken();
      return false;
    } finally {
      setRuntimeState({ initialized: true });
      restorePromise = null;
    }
  })();

  return restorePromise;
};

export const clearAuthState = () => {
  clearAccessToken();
};

export const redirectToLogin = () => {
  if (redirectingToLogin) return;
  redirectingToLogin = true;

  const returnTo = encodeURIComponent(
    `${window.location.pathname}${window.location.search}${window.location.hash}`,
  );

  window.location.href = `${routes.login}?returnTo=${returnTo}`;
};

export const handleUnauthorized = async () => {
  clearAuthState();

  try {
    await authClient.signOut();
  } catch (error) {
    console.error("Sign-out after unauthorized failed:", error);
  } finally {
    redirectToLogin();
  }
};

export const getAuthCallbackErrorMessage = (search: string) => {
  const params = new URLSearchParams(search);
  const rawError =
    params.get("error_description") ||
    params.get("error_message") ||
    params.get("message") ||
    params.get("error");

  if (!rawError) return null;

  const normalized = rawError.toLowerCase();

  if (normalized.includes("access_denied")) {
    return "第三方登录已取消，请重新尝试。";
  }
  if (normalized.includes("state")) {
    return "第三方登录状态校验失败，请重新发起登录。";
  }
  if (normalized.includes("callback")) {
    return "第三方登录回调失败，请检查回调地址配置。";
  }
  if (normalized.includes("account")) {
    return "账号关联失败，请先使用已绑定方式登录。";
  }
  if (normalized.includes("email")) {
    return "第三方账号未返回可用邮箱，暂时无法登录。";
  }
  if (normalized.includes("oauth")) {
    return "第三方登录失败，请检查 OAuth 配置。";
  }

  return rawError;
};

const buildSocialErrorCallbackURL = (callbackURL: string) => {
  const loginURL = new URL("/login", window.location.origin);

  try {
    const targetURL = new URL(callbackURL, window.location.origin);

    if (targetURL.origin === window.location.origin) {
      const returnTo = `${targetURL.pathname}${targetURL.search}${targetURL.hash}`;
      if (isSafeInternalPath(returnTo)) {
        loginURL.searchParams.set("returnTo", returnTo);
      }
    }
  } catch {
    // Fall back to the plain login page when callbackURL is malformed.
  }

  return loginURL.toString();
};

export const signInWithEmail = async (
  email: string,
  password: string,
): Promise<AuthActionResult> => {
  try {
    const result = await signIn.email({
      email,
      password,
    });

    if (!result.error) {
      const data = result.data as
        | {
            session?: { token?: string };
            token?: string;
          }
        | undefined;
      const tokenFromSession =
        data?.session?.token || data?.token || getAccessToken();
      if (tokenFromSession) {
        setAccessToken(tokenFromSession);
      }
    }

    return toAuthResult(result, "邮箱登录失败，请检查邮箱和密码。");
  } catch (error) {
    return {
      success: false,
      error: {
        message: getErrorMessage(error, "邮箱登录失败，请检查邮箱和密码。"),
      },
    };
  }
};

export const signUpWithEmail = async (
  email: string,
  password: string,
  name: string,
): Promise<AuthActionResult> => {
  try {
    const result = await signUp.email({
      email,
      password,
      name,
      callbackURL: window.location.origin,
    });
    return toAuthResult(result, "邮箱注册失败，请稍后重试。");
  } catch (error) {
    console.error("Register failed:", error);
    return {
      success: false,
      error: {
        message: getErrorMessage(error, "邮箱注册失败，请检查网络或邮箱配置。"),
      },
    };
  }
};

export const sendRegisterCode = async (
  email: string,
): Promise<
  AuthActionResult<{
    cooldownSeconds?: number;
    emailRegistered?: boolean;
    emailVerified?: boolean;
    expiresInSeconds?: number;
    remainingSeconds?: number;
  }>
> => {
  try {
    const response = await fetch(`${baseUrl}/auth/register/send-code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          code?: number;
          message?: string;
          data?: {
            cooldownSeconds?: number;
            emailRegistered?: boolean;
            emailVerified?: boolean;
            expiresInSeconds?: number;
            remainingSeconds?: number;
          };
        }
      | null;

    if (!response.ok || payload?.code === 0) {
      return {
        success: false,
        error: {
          message: payload?.message || "验证码发送失败，请稍后重试。",
        },
        data: payload?.data,
      };
    }

    return {
      success: true,
      data: payload?.data,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        message: getErrorMessage(error, "验证码发送失败，请稍后重试。"),
      },
    };
  }
};

export const registerWithCode = async ({
  username,
  email,
  password,
  code,
}: {
  username: string;
  email: string;
  password: string;
  code: string;
}): Promise<AuthActionResult> => {
  try {
    const response = await fetch(`${baseUrl}/auth/register/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        email,
        password,
        code,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { code?: number; message?: string; data?: unknown }
      | null;

    if (!response.ok || payload?.code === 0) {
      return {
        success: false,
        error: {
          message: payload?.message || "注册失败，请检查验证码后重试。",
        },
      };
    }

    return {
      success: true,
      data: payload?.data ?? payload ?? undefined,
    };
  } catch (error) {
    console.error("Register failed:", error);
    return {
      success: false,
      error: {
        message: getErrorMessage(error, "注册失败，请检查网络或邮箱配置。"),
      },
    };
  }
};

export const signInWithGitHub = async (
  callbackURL = window.location.href,
): Promise<AuthActionResult> => {
  try {
    const errorCallbackURL = buildSocialErrorCallbackURL(callbackURL);
    const result = await signIn.social({
      provider: "github",
      callbackURL,
      errorCallbackURL,
    });
    return toAuthResult(result, "GitHub 登录发起失败，请稍后重试。");
  } catch (error) {
    console.error("GitHub sign-in failed:", error);
    return {
      success: false,
      error: {
        message: getErrorMessage(error, "GitHub 登录发起失败，请检查配置。"),
      },
    };
  }
};

export const signInWithGoogle = async (
  callbackURL = window.location.href,
): Promise<AuthActionResult> => {
  try {
    const errorCallbackURL = buildSocialErrorCallbackURL(callbackURL);
    const result = await signIn.social({
      provider: "google",
      callbackURL,
      errorCallbackURL,
    });
    return toAuthResult(result, "Google 登录发起失败，请稍后重试。");
  } catch (error) {
    console.error("Google sign-in failed:", error);
    return {
      success: false,
      error: {
        message: getErrorMessage(error, "Google 登录发起失败，请检查配置。"),
      },
    };
  }
};

export const signOut = async () => {
  try {
    await authClient.signOut();
    clearAuthState();
    return { success: true };
  } catch (error) {
    console.error("Sign-out failed:", error);
    clearAuthState();
    return {
      success: false,
      error: {
        message: getErrorMessage(error, "退出登录失败，请稍后重试。"),
      },
    };
  }
};

export const requestPasswordReset = async (
  email: string,
): Promise<
  AuthActionResult<{
    cooldownSeconds?: number;
    expiresInSeconds?: number;
    remainingSeconds?: number;
  }>
> => {
  try {
    const response = await fetch(`${baseUrl}/auth/password/reset/send-code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          code?: number;
          message?: string;
          data?: {
            cooldownSeconds?: number;
            expiresInSeconds?: number;
            remainingSeconds?: number;
          };
        }
      | null;

    if (!response.ok || payload?.code === 0) {
      return {
        success: false,
        error: {
          message: payload?.message || "密码重置验证码发送失败，请稍后重试。",
        },
        data: payload?.data,
      };
    }

    return {
      success: true,
      data: payload?.data,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        message: getErrorMessage(error, "密码重置验证码发送失败，请稍后重试。"),
      },
    };
  }
};

export const resetPasswordWithToken = async (
  token: string,
  newPassword: string,
): Promise<AuthActionResult> => {
  try {
    const result = await authClient.resetPassword({
      newPassword,
      token,
    });
    return toAuthResult(result, "重置密码失败，请重新获取重置链接。");
  } catch (error) {
    return {
      success: false,
      error: {
        message: getErrorMessage(error, "重置密码失败，请重新获取重置链接。"),
      },
    };
  }
};

export const resetPasswordWithCode = async (
  email: string,
  code: string,
  newPassword: string,
): Promise<AuthActionResult> => {
  try {
    const response = await fetch(`${baseUrl}/auth/password/reset-by-code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        code,
        newPassword,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { code?: number; message?: string }
      | null;

    if (!response.ok || payload?.code === 0) {
      return {
        success: false,
        error: {
          message: payload?.message || "重置密码失败，请检查验证码后重试。",
        },
      };
    }

    return {
      success: true,
      data: payload ?? undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        message: getErrorMessage(error, "重置密码失败，请检查验证码后重试。"),
      },
    };
  }
};

export const resendVerificationCode = async (
  email: string,
): Promise<AuthActionResult> => {
  try {
    const response = await fetch(`${baseUrl}/auth/email/resend-verification-code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { code?: number; message?: string }
      | null;

    if (!response.ok || payload?.code === 0) {
      return {
        success: false,
        error: {
          message: payload?.message || "验证码发送失败，请稍后重试。",
        },
      };
    }

    return {
      success: true,
      data: payload ?? undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        message: getErrorMessage(error, "验证码发送失败，请稍后重试。"),
      },
    };
  }
};

export const verifyEmailWithCode = async (
  email: string,
  code: string,
): Promise<AuthActionResult> => {
  try {
    const response = await fetch(`${baseUrl}/auth/email/verify-by-code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        code,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { code?: number; message?: string }
      | null;

    if (!response.ok || payload?.code === 0) {
      return {
        success: false,
        error: {
          message: payload?.message || "邮箱验证失败，请检查验证码后重试。",
        },
      };
    }

    return {
      success: true,
      data: payload ?? undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        message: getErrorMessage(error, "邮箱验证失败，请检查验证码后重试。"),
      },
    };
  }
};

export const sendAccountDeletionCode = async (): Promise<
  AuthActionResult<{
    cooldownSeconds?: number;
    email?: string;
    expiresInSeconds?: number;
    remainingSeconds?: number;
  }>
> => {
  try {
    const response = await fetch(`${baseUrl}/auth/account/delete/send-code`, {
      method: "POST",
      headers: getAuthorizedJsonHeaders(),
      body: JSON.stringify({}),
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          code?: number;
          message?: string;
          data?: {
            cooldownSeconds?: number;
            email?: string;
            expiresInSeconds?: number;
            remainingSeconds?: number;
          };
        }
      | null;

    if (!response.ok || payload?.code === 0) {
      return {
        success: false,
        error: {
          message: payload?.message || "注销验证码发送失败，请稍后重试。",
        },
        data: payload?.data,
      };
    }

    return {
      success: true,
      data: payload?.data,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        message: getErrorMessage(error, "注销验证码发送失败，请稍后重试。"),
      },
    };
  }
};

export const deleteAccountWithCode = async (
  code: string,
): Promise<AuthActionResult> => {
  try {
    const response = await fetch(`${baseUrl}/auth/account/delete/confirm`, {
      method: "POST",
      headers: getAuthorizedJsonHeaders(),
      body: JSON.stringify({
        code,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { code?: number; message?: string; data?: unknown }
      | null;

    if (!response.ok || payload?.code === 0) {
      return {
        success: false,
        error: {
          message: payload?.message || "账号注销失败，请检查验证码后重试。",
        },
      };
    }

    clearAuthState();
    return {
      success: true,
      data: payload?.data ?? payload ?? undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        message: getErrorMessage(error, "账号注销失败，请稍后重试。"),
      },
    };
  }
};

export const getCurrentSession = async () => {
  try {
    const session = await authClient.getSession();
    const tokenFromSession =
      (session.data?.session as { token?: string } | undefined)?.token || null;

    if (tokenFromSession) {
      setAccessToken(tokenFromSession);
    }

    return { success: true, session };
  } catch (error) {
    console.error("Get session failed:", error);
    return {
      success: false,
      error: {
        message: getErrorMessage(error, "获取登录状态失败。"),
      },
    };
  }
};

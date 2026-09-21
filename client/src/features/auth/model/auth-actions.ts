import { getApiBaseUrl } from "@/utils/env";
import { isSafeInternalPath } from "@/utils/routes";
import {
  AuthMutationIndeterminateError,
  authSessionCoordinator,
} from "./session-coordinator";
import type { AuthActionResult } from "./types";
import type { AuthCredentialSnapshot } from "./types";
import { authorizedFetch } from "./authorized-fetch";

interface ApiPayload<T> {
  code?: number;
  message?: string;
  data?: T;
}

interface VerificationCodeMetadata {
  cooldownSeconds?: number;
  expiresInSeconds?: number;
  remainingSeconds?: number;
}

interface RegisterCodeMetadata extends VerificationCodeMetadata {
  emailRegistered?: boolean;
  emailVerified?: boolean;
}

interface AccountDeletionCodeMetadata extends VerificationCodeMetadata {
  email?: string;
}

/** 账号注销动作依赖的协调器契约。 */
export interface AccountDeletionCoordinator {
  /** @returns 捕获的注销专用凭证，当前无身份时为 null。 */
  beginAccountDeletion(): AuthCredentialSnapshot | null;
  /**
   * 在明确业务失败后受控恢复身份。
   * @param message 失败消息。
   * @returns 确认完成后的 Promise。
   */
  completeAccountDeletionFailure(message: string): Promise<void>;
  /**
   * 串行执行 Cookie mutation。
   * @param operation 接收中止信号的底层请求。
   * @returns mutation 结果。
   */
  runCookieMutation<T>(
    operation: (signal: AbortSignal) => Promise<T>,
  ): Promise<T>;
  /**
   * 发布远端已明确匿名。
   * @param reason 确认原因。
   * @returns 无返回值。
   */
  confirmAnonymous(reason: string): void;
}

/**
 * 把未知错误转换为认证操作错误。
 * @param error 未知错误。
 * @param fallback 兜底消息。
 * @returns 统一失败结果。
 */
const toFailure = (error: unknown, fallback: string): AuthActionResult => {
  if (error instanceof Error && error.message.trim()) {
    return { success: false, error: { message: error.message } };
  }
  return { success: false, error: { message: fallback } };
};

/**
 * 调用 Nubbi JSON API 并转换为认证结果。
 * @param path API 路径。
 * @param body JSON 请求体。
 * @param fallback 失败兜底消息。
 * @param authenticated 是否要求当前认证凭证。
 * @returns 统一认证操作结果。
 */
const postAuthApi = async <T>(
  path: string,
  body: unknown,
  fallback: string,
  authenticated = false,
): Promise<AuthActionResult<T>> => {
  try {
    const response = authenticated
      ? await authorizedFetch(path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      : await fetch(`${getApiBaseUrl()}${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
    const payload = (await response.json().catch(() => null)) as ApiPayload<T> | null;
    if (!response.ok || !payload || payload.code === 0) {
      return {
        success: false,
        error: { message: payload?.message || fallback },
        data: payload?.data,
      };
    }
    return { success: true, data: payload.data };
  } catch (error) {
    return toFailure(error, fallback) as AuthActionResult<T>;
  }
};

/**
 * 解析认证动作使用的相对 API 地址。
 * @param path API 相对路径。
 * @returns 完整 API 地址。
 */
const resolveAuthApiUrl = (path: string): string =>
  `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;

/**
 * 使用邮箱密码登录。
 * @param email 邮箱地址。
 * @param password 登录密码。
 * @returns 登录结果。
 */
export const signInWithEmail = (
  email: string,
  password: string,
): Promise<AuthActionResult> => authSessionCoordinator.signInWithEmail(email, password);

/** 构造安全的 OAuth 错误回调地址。 */
const buildSocialErrorCallbackURL = (callbackURL: string): string => {
  const loginURL = new URL("/login", window.location.origin);
  try {
    const targetURL = new URL(callbackURL, window.location.origin);
    if (targetURL.origin === window.location.origin) {
      const returnTo = `${targetURL.pathname}${targetURL.search}${targetURL.hash}`;
      if (isSafeInternalPath(returnTo)) loginURL.searchParams.set("returnTo", returnTo);
    }
  } catch {
    // 回调地址无效时安全回退到普通登录页。
  }
  return loginURL.toString();
};

/** @param callbackURL 登录成功回调地址。 @returns GitHub OAuth 发起结果。 */
export const signInWithGitHub = (callbackURL = window.location.href): Promise<AuthActionResult> =>
  authSessionCoordinator.startOAuth("github", callbackURL, buildSocialErrorCallbackURL(callbackURL));

/** @param callbackURL 登录成功回调地址。 @returns Google OAuth 发起结果。 */
export const signInWithGoogle = (callbackURL = window.location.href): Promise<AuthActionResult> =>
  authSessionCoordinator.startOAuth("google", callbackURL, buildSocialErrorCallbackURL(callbackURL));

/** @returns 远端确认后的退出结果。 */
export const signOut = (): Promise<AuthActionResult> => authSessionCoordinator.signOut();

/** @param email 邮箱地址。 @returns 注册验证码发送结果。 */
export const sendRegisterCode = (
  email: string,
): Promise<AuthActionResult<RegisterCodeMetadata>> =>
  postAuthApi<RegisterCodeMetadata>(
    "/auth/register/send-code",
    { email },
    "验证码发送失败，请稍后重试。",
  );

/**
 * 完成注册并通过统一邮箱登录入口确认会话。
 * @param input 注册字段。
 * @returns 注册及自动登录结果。
 */
export const registerWithCode = async (input: {
  username: string;
  email: string;
  password: string;
  code: string;
}): Promise<AuthActionResult> => {
  const registered = await postAuthApi("/auth/register/email", input, "注册失败，请检查验证码后重试。");
  if (!registered.success) return registered;
  return authSessionCoordinator.signInWithEmail(input.email, input.password);
};

/** @param email 邮箱地址。 @returns 密码重置验证码发送结果。 */
export const requestPasswordReset = (
  email: string,
): Promise<AuthActionResult<VerificationCodeMetadata>> =>
  postAuthApi<VerificationCodeMetadata>(
    "/auth/password/reset/send-code",
    { email },
    "密码重置验证码发送失败，请稍后重试。",
  );

/** @param email 邮箱。 @param code 验证码。 @param newPassword 新密码。 @returns 重置结果。 */
export const resetPasswordWithCode = (email: string, code: string, newPassword: string): Promise<AuthActionResult> =>
  postAuthApi("/auth/password/reset-by-code", { email, code, newPassword }, "重置密码失败，请检查验证码后重试。");

/** @param email 邮箱地址。 @returns 邮箱验证码重发结果。 */
export const resendVerificationCode = (
  email: string,
): Promise<AuthActionResult<VerificationCodeMetadata>> =>
  postAuthApi<VerificationCodeMetadata>(
    "/auth/email/resend-verification-code",
    { email },
    "验证码发送失败，请稍后重试。",
  );

/** @param email 邮箱。 @param code 验证码。 @returns 邮箱验证结果。 */
export const verifyEmailWithCode = (email: string, code: string): Promise<AuthActionResult> =>
  postAuthApi("/auth/email/verify-by-code", { email, code }, "邮箱验证失败，请检查验证码后重试。");

/** @returns 账号注销验证码发送结果。 */
export const sendAccountDeletionCode = (): Promise<
  AuthActionResult<AccountDeletionCodeMetadata>
> =>
  postAuthApi<AccountDeletionCodeMetadata>(
    "/auth/account/delete/send-code",
    {},
    "注销验证码发送失败，请稍后重试。",
    true,
  );

/**
 * 创建账号注销动作，便于隔离验证明确失败与 transport 不确定结果。
 * @param coordinator 账号注销协调器依赖。
 * @param fetcher 可注入的 fetch 实现。
 * @returns 接收验证码的账号注销函数。
 */
export const createDeleteAccountWithCode = (
  coordinator: AccountDeletionCoordinator,
  fetcher: typeof fetch = fetch,
) => async (code: string): Promise<AuthActionResult> => {
  try {
    return await coordinator.runCookieMutation(async (signal) => {
      const credential = coordinator.beginAccountDeletion();
      if (!credential) {
        return {
          success: false,
          error: { message: "暂时无法确认登录状态，请重试。" },
        };
      }
      const response = await fetcher(resolveAuthApiUrl("/auth/account/delete/confirm"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${credential.token}`,
          "Content-Type": "application/json",
        },
        credentials: "omit",
        body: JSON.stringify({ code, confirmed: true }),
        signal,
      });
      const payload = (await response.json().catch(() => null)) as ApiPayload<unknown> | null;
      if (!response.ok || !payload || payload.code === 0) {
        const message = payload?.message || "账号注销失败，请检查验证码后重试。";
        await coordinator.completeAccountDeletionFailure(message);
        return { success: false, error: { message }, data: payload?.data };
      }
      coordinator.confirmAnonymous("account-deleted");
      return { success: true, data: payload.data };
    });
  } catch (error) {
    if (error instanceof AuthMutationIndeterminateError) {
      if (error.confirmedSnapshot.status === "anonymous") {
        return { success: true };
      }
      const message =
        error.confirmedSnapshot.status === "authenticated"
          ? "账号注销未生效，请重试。"
          : "账号注销结果无法确认，请稍后重试。";
      return { success: false, error: { message } };
    }
    const result = toFailure(error, "账号注销结果无法确认，请稍后重试。");
    return result;
  }
};

/**
 * 使用浏览器唯一协调器确认账号注销。
 * @param code 注销验证码。
 * @returns 注销结果。
 */
export const deleteAccountWithCode = createDeleteAccountWithCode(
  authSessionCoordinator,
);

/** @param imageUrl 新头像地址。 @returns 头像更新结果。 */
export const updateAuthAvatar = async (imageUrl: string): Promise<AuthActionResult<{ image: string }>> => {
  const result = await postAuthApi<{ image: string }>(
    "/auth/avatar/update",
    { imageUrl },
    "头像更新失败",
    true,
  );
  if (result.success) await authSessionCoordinator.refresh();
  return result;
};

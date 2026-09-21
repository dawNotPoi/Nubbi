import {
  authSessionCoordinator,
  useAuthSessionSnapshot,
} from "@/features/auth/model/session-coordinator";
import { isSafeInternalPath, routes } from "./routes";

export { authClient } from "@/features/auth/model/auth-client";
export {
  authSessionCoordinator,
  createAuthSessionCoordinator,
  getAuthSessionSnapshot,
  subscribeAuthSession,
  useAuthSessionSnapshot,
} from "@/features/auth/model/session-coordinator";
export * from "@/features/auth/model/auth-actions";
export * from "@/features/auth/model/authorized-fetch";
export type * from "@/features/auth/model/types";

const AUTH_ENTRY_PATHS = new Set([routes.login, "/reset-password"]);

/**
 * 判断认证完成后的返回地址是否为安全且不会自循环的站内页面。
 * @param path 待检查的相对地址。
 * @returns 可安全回跳业务页时为 true。
 */
export const isSafeAuthReturnPath = (
  path?: string | null,
): path is string => {
  if (!isSafeInternalPath(path) || path.includes("\\")) return false;
  try {
    const base = new URL("https://nubbi.invalid");
    const target = new URL(path, base);
    const normalizedPath = target.pathname.replace(/\/+$/, "") || "/";
    return (
      target.origin === base.origin && !AUTH_ENTRY_PATHS.has(normalizedPath)
    );
  } catch {
    return false;
  }
};

/**
 * 从候选地址中选择首个安全业务页回跳地址。
 * @param candidates 查询参数与路由 state 等候选地址。
 * @param fallback 没有安全候选时的默认页面。
 * @returns 安全的站内业务地址。
 */
export const resolveAuthReturnTo = (
  candidates: Array<string | null | undefined>,
  fallback = routes.home,
): string => candidates.find(isSafeAuthReturnPath) ?? fallback;

/**
 * 为迁移期调用方提供从唯一快照派生的 Better Auth 风格 Hook。
 * @returns 会话数据、加载状态与统一刷新入口。
 */
export const useSession = () => {
  const snapshot = useAuthSessionSnapshot();
  return {
    data: snapshot.user ? { user: snapshot.user } : null,
    isPending: snapshot.status === "checking",
    refetch: async () => {
      const next = await authSessionCoordinator.refresh();
      return { data: next.user ? { user: next.user } : null };
    },
  };
};

/**
 * 跳转登录页并携带当前站内返回地址。
 * @returns 无返回值。
 */
export const redirectToLogin = (): void => {
  const returnTo = encodeURIComponent(
    `${window.location.pathname}${window.location.search}${window.location.hash}`,
  );
  window.location.href = `${routes.login}?returnTo=${returnTo}`;
};

/**
 * 解析 OAuth 回调错误为用户可读文本。
 * @param search URL 查询字符串。
 * @returns 错误文本；不存在错误时为 null。
 */
export const getAuthCallbackErrorMessage = (search: string): string | null => {
  const params = new URLSearchParams(search);
  const rawError =
    params.get("error_description") ||
    params.get("error_message") ||
    params.get("message") ||
    params.get("error");
  if (!rawError) return null;
  const normalized = rawError.toLowerCase();
  if (normalized.includes("access_denied")) return "第三方登录已取消，请重新尝试。";
  if (normalized.includes("state")) return "第三方登录状态校验失败，请重新发起登录。";
  if (normalized.includes("callback")) return "第三方登录回调失败，请检查回调地址配置。";
  if (normalized.includes("account")) return "账号关联失败，请先使用已绑定方式登录。";
  if (normalized.includes("email")) return "第三方账号未返回可用邮箱，暂时无法登录。";
  if (normalized.includes("oauth")) return "第三方登录失败，请检查 OAuth 配置。";
  return rawError;
};

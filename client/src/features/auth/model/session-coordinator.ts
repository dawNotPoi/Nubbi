import { useSyncExternalStore } from "react";
import { browserAuthProvider } from "./auth-client";
import { createBrowserIdentityBroadcast } from "./auth-lifecycle";
import { openOAuthPopup, type OAuthPopup } from "./oauth-popup";
import type {
  AuthActionResult,
  AuthCoordinatorClock,
  AuthCredentialSnapshot,
  AuthIdentityBroadcast,
  AuthOperation,
  AuthProviderSignInResult,
  AuthSessionProvider,
  AuthSessionSnapshot,
} from "./types";

const AUTH_TIMEOUT_MS = 10_000;
const JWT_REFRESH_WINDOW_MS = 2 * 60 * 1000;
const SIGN_OUT_UNCONFIRMED_MESSAGE = "远端会话未确认退出，请重试。";
const OAUTH_IDENTITY_PENDING_KEY = "nubbi.auth.oauth-identity-pending";

/** 创建协调器所需的可注入依赖。 */
export interface AuthSessionCoordinatorDependencies {
  provider: AuthSessionProvider;
  clock?: AuthCoordinatorClock;
  broadcast?: AuthIdentityBroadcast;
  timeoutMs?: number;
  navigate?: (url: string) => void;
  openOAuthPopup?: () => OAuthPopup | null;
  initialSignOutPending?: boolean;
}

/** 身份生命周期变化事件。 */
export interface AuthIdentityLifecycleEvent {
  reason: string;
  generation: number;
}

/** 最终认证拒绝的协调收敛结果。 */
export interface AuthUnauthorizedSettlement {
  accepted: boolean;
  snapshot: AuthSessionSnapshot;
}

/** 普通会话刷新对暂时失败的处理选项。 */
export interface AuthRefreshOptions {
  /** 是否允许在新鲜 JWT 下保留当前已认证身份。 */
  allowRetain?: boolean;
}

/** 会话协调器公开能力。 */
export interface AuthSessionCoordinator {
  /** @returns 当前 UI 会话快照。 */
  getSnapshot(): AuthSessionSnapshot;
  /** @returns 当前可用于请求的凭证快照，无可用凭证时为 null。 */
  getCredentialSnapshot(): AuthCredentialSnapshot | null;
  /**
   * 订阅 UI 会话快照变化。
   * @param listener 变化回调。
   * @returns 取消订阅函数。
   */
  subscribe(listener: () => void): () => void;
  /**
   * 订阅身份失效生命周期。
   * @param listener 生命周期回调。
   * @returns 取消订阅函数。
   */
  subscribeIdentityLifecycle(
    listener: (event: AuthIdentityLifecycleEvent) => void,
  ): () => void;
  /** @returns 首次会话恢复完成后的快照。 */
  bootstrap(): Promise<AuthSessionSnapshot>;
  /**
   * 刷新当前代次会话。
   * @param options 暂时失败时是否允许保留新鲜凭证。
   * @returns 当前代次刷新完成后的快照。
   */
  refresh(options?: AuthRefreshOptions): Promise<AuthSessionSnapshot>;
  /** @returns 新鲜 JWT 或 Session 凭证；身份不可用时为 null。 */
  ensureCredential(): Promise<AuthCredentialSnapshot | null>;
  /**
   * 在原账号原代次仍有效时，使最终认证拒绝只失效一次并受控确认会话。
   * @param rejectedCredential 被服务端最终拒绝的请求凭证。
   * @returns 是否接受本次拒绝及最终收敛的会话快照。
   */
  settleUnauthorized(
    rejectedCredential: AuthCredentialSnapshot,
  ): Promise<AuthUnauthorizedSettlement>;
  /**
   * 提交邮箱密码登录并由同一协调器确认会话。
   * @param email 邮箱地址。
   * @param password 登录密码。
   * @returns 登录操作结果。
   */
  signInWithEmail(email: string, password: string): Promise<AuthActionResult>;
  /**
   * 发起 OAuth 跳转，发起成功不等于已认证。
   * @param provider Provider 名称。
   * @param callbackURL 登录完成回调地址。
   * @param errorCallbackURL 登录错误回调地址。
   * @returns OAuth 发起结果。
   */
  startOAuth(
    provider: "github" | "google",
    callbackURL: string,
    errorCallbackURL: string,
  ): Promise<AuthActionResult>;
  /** @returns 远端确认后的退出结果。 */
  signOut(): Promise<AuthActionResult>;
  /**
   * 使旧身份与旧异步结果失效。
   * @param reason 不含敏感信息的失效原因。
   * @returns 新会话代次。
   */
  invalidateIdentity(reason: string): number;
  /**
   * 在远端已明确不存在会话时发布匿名状态。
   * @param reason 不含敏感信息的确认原因。
   * @returns 无返回值。
   */
  confirmAnonymous(reason: string): void;
  /**
   * 提交与某次 Provider 请求绑定的认证响应头。
   * @param generation 请求发起时捕获的会话代次。
   * @param response Provider 原始响应。
   * @returns 是否接受了该响应。
   */
  commitProviderHeaders(generation: number, response: Response): boolean;
  /**
   * 临时设置操作状态，供账号注销等动作复用同一状态机。
   * @param operation 下一操作状态。
   * @param error 可选错误消息。
   * @returns 无返回值。
   */
  setOperation(operation: AuthOperation, error?: string | null): void;
  /**
   * 捕获注销专用凭证并原子进入 deletion-pending 代次。
   * @returns 仅供本次注销请求使用的旧代次凭证；当前无身份时为 null。
   */
  beginAccountDeletion(): AuthCredentialSnapshot | null;
  /**
   * 在远端明确拒绝注销时恢复当前身份操作能力。
   * @param message 明确业务失败消息。
   * @returns 无返回值。
   */
  completeAccountDeletionFailure(message: string): Promise<void>;
  /**
   * 串行执行会改变认证 Cookie 的动作；transport 不确定时先确认会话再释放门槛。
   * @param operation 接收中止信号的 Cookie mutation。
   * @returns mutation 结果。
   */
  runCookieMutation<T>(
    operation: (signal: AbortSignal) => Promise<T>,
  ): Promise<T>;
}

/** Cookie mutation 在 transport 层无法确认结果。 */
export class AuthMutationIndeterminateError extends Error {
  /** 受控确认后的会话快照。 */
  readonly confirmedSnapshot: AuthSessionSnapshot;

  /**
   * 创建结果不确定错误。
   * @param message 错误消息。
   * @param confirmedSnapshot 受控确认后的会话快照。
   */
  constructor(message: string, confirmedSnapshot: AuthSessionSnapshot) {
    super(message);
    this.name = "AuthMutationIndeterminateError";
    this.confirmedSnapshot = confirmedSnapshot;
  }
}

interface PrivateCredentialState {
  accessToken: string | null;
  jwtToken: string | null;
  jwtExpiresAt: number | null;
  version: number;
}

const defaultClock: AuthCoordinatorClock = {
  now: () => Date.now(),
  setTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
  clearTimeout: (handle) => clearTimeout(handle),
};

/**
 * 从 JWT 载荷读取过期时间；无法解析时按不可复用处理。
 * @param token JWT 字符串。
 * @returns Unix 毫秒过期时间，无法解析时为 null。
 */
const parseJwtExpiry = (token: string): number | null => {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as { exp?: unknown };
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

/**
 * 规范化未知错误为可展示文本。
 * @param error 未知错误。
 * @param fallback 无明确消息时的兜底文本。
 * @returns 用户可读错误文本。
 */
const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object") {
    const candidate = error as {
      message?: unknown;
      code?: unknown;
      error?: { message?: unknown; code?: unknown };
    };
    const code = candidate.error?.code ?? candidate.code;
    if (code === "EMAIL_NOT_VERIFIED") {
      return "邮箱还没有验证，请先输入邮箱验证码完成验证。";
    }
    const message = candidate.error?.message ?? candidate.message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
};

/**
 * 从 Provider 错误中提取顶层或嵌套错误码。
 * @param error 未知 Provider 错误。
 * @returns 错误码，不存在时为 undefined。
 */
const getErrorCode = (error: unknown): string | undefined => {
  if (!error || typeof error !== "object") return undefined;
  const candidate = error as {
    code?: unknown;
    error?: { code?: unknown };
  };
  const code = candidate.error?.code ?? candidate.code;
  return typeof code === "string" ? code : undefined;
};

/**
 * 创建带超时的 Promise，超时不会允许晚到结果提交状态。
 * @param promise 原始异步操作。
 * @param timeoutMs 超时毫秒数。
 * @param clock 可注入时钟。
 * @returns 原始结果。
 */
const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  clock: AuthCoordinatorClock,
): Promise<T> => {
  let handle: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_resolve, reject) => {
    handle = clock.setTimeout(() => reject(new Error("认证服务响应超时，请重试。")), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (handle !== null) clock.clearTimeout(handle);
  }
};

/**
 * 给不可无限等待的 Cookie mutation 增加中止和有界等待。
 * @param operation 接收中止信号的底层请求。
 * @param timeoutMs 超时毫秒数。
 * @param clock 可注入时钟。
 * @returns 底层结果。
 */
const withAbortTimeout = async <T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  clock: AuthCoordinatorClock,
): Promise<T> => {
  const controller = new AbortController();
  const request = operation(controller.signal);
  let handle: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_resolve, reject) => {
    handle = clock.setTimeout(() => {
      controller.abort();
      reject(new Error("认证操作响应超时，请重试。"));
    }, timeoutMs);
  });
  try {
    return await Promise.race([request, timeout]);
  } catch (error) {
    if (controller.signal.aborted) {
      await request.catch(() => undefined);
    }
    throw error;
  } finally {
    if (handle !== null) clock.clearTimeout(handle);
  }
};

/**
 * 创建唯一会话快照与凭证代次协调器。
 * @param deps Provider、时钟、广播与超时依赖。
 * @returns 可独立注入和验证的认证协调器。
 */
export const createAuthSessionCoordinator = (
  deps: AuthSessionCoordinatorDependencies,
): AuthSessionCoordinator => {
  const clock = deps.clock ?? defaultClock;
  const timeoutMs = deps.timeoutMs ?? AUTH_TIMEOUT_MS;
  const listeners = new Set<() => void>();
  const lifecycleListeners = new Set<(event: AuthIdentityLifecycleEvent) => void>();
  let snapshot: AuthSessionSnapshot = {
    status: "checking",
    user: null,
    generation: 0,
    operation: "idle",
    error: null,
    initialized: false,
  };
  let credential: PrivateCredentialState = {
    accessToken: null,
    jwtToken: null,
    jwtExpiresAt: null,
    version: 0,
  };
  let recoveryFlight: {
    generation: number;
    allowRetain: boolean;
    promise: Promise<AuthSessionSnapshot>;
  } | null = null;
  let loginFlight: Promise<AuthActionResult> | null = null;
  let mutationTail: Promise<void> = Promise.resolve();
  let navigationGeneration: number | null = null;
  let deletionPending = false;
  let signOutPending = deps.initialSignOutPending ?? false;
  let identityMutationPending = 0;
  let unauthorizedSettlementFlight: {
    userId: string;
    generation: number;
    version: number;
    promise: Promise<AuthUnauthorizedSettlement>;
  } | null = null;

  /** 发布不可变 UI 快照。 */
  const publish = (next: Partial<AuthSessionSnapshot>): void => {
    snapshot = { ...snapshot, ...next };
    listeners.forEach((listener) => listener());
  };

  /** 清除仅供请求使用的内存凭证。 */
  const clearCredential = (): void => {
    credential = {
      accessToken: null,
      jwtToken: null,
      jwtExpiresAt: null,
      version: credential.version + 1,
    };
  };

  /**
   * 读取当前请求凭证；外部调用在身份 mutation 临界区内永远拿不到凭证。
   * @param allowIdentityMutation 仅供 mutation 内部捕获专用旧凭证。
   * @returns 当前可用凭证或 null。
   */
  const readCredentialSnapshot = (
    allowIdentityMutation = false,
  ): AuthCredentialSnapshot | null => {
    if (
      (!allowIdentityMutation && identityMutationPending > 0) ||
      snapshot.status !== "authenticated" ||
      !snapshot.user ||
      snapshot.operation === "deleting" ||
      snapshot.operation === "signingOut" ||
      deletionPending
    ) {
      return null;
    }
    const jwtFresh =
      credential.jwtToken &&
      credential.jwtExpiresAt !== null &&
      credential.jwtExpiresAt - clock.now() > JWT_REFRESH_WINDOW_MS;
    const token = jwtFresh ? credential.jwtToken : credential.accessToken;
    if (!token) return null;
    return {
      userId: snapshot.user.id,
      generation: snapshot.generation,
      version: credential.version,
      token,
    };
  };

  /**
   * 在指定代次仍有效时执行会话恢复。
   * @param generation 请求发起时的身份代次。
   * @param allowIdentityMutation 是否为身份 mutation 内部强制确认。
   * @param deletionConfirmation 是否为注销结果确认。
   * @returns 恢复完成后的会话快照。
   */
  const recoverGeneration = (
    generation: number,
    allowIdentityMutation = false,
    deletionConfirmation = false,
    allowRetain = true,
  ): Promise<AuthSessionSnapshot> => {
    if (signOutPending) return Promise.resolve(snapshot);
    if (
      (identityMutationPending > 0 && !allowIdentityMutation) ||
      (deletionPending && !deletionConfirmation)
    ) {
      return Promise.resolve(snapshot);
    }
    if (allowIdentityMutation || deletionConfirmation) {
      recoveryFlight = null;
    }
    if (recoveryFlight?.generation === generation) {
      if (!allowRetain) recoveryFlight.allowRetain = false;
      return recoveryFlight.promise;
    }

    const promise = (async (): Promise<AuthSessionSnapshot> => {
      const retainedUser = snapshot.user;
      const canRetainBackgroundIdentity =
        snapshot.initialized &&
        snapshot.status === "authenticated" &&
        retainedUser !== null &&
        !allowIdentityMutation &&
        !deletionConfirmation &&
        credential.jwtToken !== null &&
        credential.jwtExpiresAt !== null &&
        credential.jwtExpiresAt - clock.now() > JWT_REFRESH_WINDOW_MS;
      if (!snapshot.initialized) {
        publish({ status: "checking", error: null });
      } else if (snapshot.operation !== "redirecting" && !deletionPending) {
        publish({ operation: "refreshing", error: null });
      }
      try {
        const result = await withTimeout(
          deps.provider.getSession(generation),
          timeoutMs,
          clock,
        );
        if (generation !== snapshot.generation) return snapshot;
        coordinator.commitProviderHeaders(generation, result.response);
        if (result.sessionToken && credential.accessToken !== result.sessionToken) {
          credential = {
            ...credential,
            accessToken: result.sessionToken,
            version: credential.version + 1,
          };
        }
        if (result.user && credential.accessToken) {
          if (deletionConfirmation) deletionPending = false;
          publish({
            status: "authenticated",
            user: result.user,
            operation: "idle",
            error: null,
            initialized: true,
          });
        } else {
          clearCredential();
          if (deletionConfirmation) deletionPending = false;
          publish({
            status: "anonymous",
            user: null,
            operation: "idle",
            error: null,
            initialized: true,
          });
        }
      } catch (error) {
        if (generation !== snapshot.generation) return snapshot;
        const message = getErrorMessage(
          error,
          "暂时无法确认登录状态，请重试。",
        );
        if (
          canRetainBackgroundIdentity &&
          recoveryFlight?.generation === generation &&
          recoveryFlight.allowRetain
        ) {
          publish({
            status: "authenticated",
            user: retainedUser,
            operation: "idle",
            error: message,
            initialized: true,
          });
          return snapshot;
        }
        clearCredential();
        if (deletionConfirmation) deletionPending = false;
        publish({
          status: "unavailable",
          user: retainedUser,
          operation: "idle",
          error: message,
          initialized: true,
        });
      } finally {
        if (recoveryFlight?.generation === generation) recoveryFlight = null;
      }
      return snapshot;
    })();
    recoveryFlight = { generation, allowRetain, promise };
    return promise;
  };

  /** 串行运行 Cookie mutation，并在 transport 失败后完成受控会话确认。 */
  const runSerializedMutation = async <T>(
    operation: (signal: AbortSignal) => Promise<T>,
  ): Promise<T> => {
    identityMutationPending += 1;
    const previous = mutationTail;
    let release!: () => void;
    mutationTail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await withAbortTimeout(operation, timeoutMs, clock);
    } catch (error) {
      const message = getErrorMessage(error, "认证操作结果无法确认，请重试。");
      // 退出结果不确定时只核实远端，不把仍存活的旧会话重新发布到 UI。
      const confirmedSnapshot = signOutPending
        ? await withTimeout(deps.provider.getSession(snapshot.generation), timeoutMs, clock)
          .then((result): AuthSessionSnapshot => ({
            ...snapshot,
            status: result.user ? "authenticated" : "anonymous",
          }))
          .catch(() => ({ ...snapshot, status: "unavailable" as const }))
        : await recoverGeneration(
          snapshot.generation,
          true,
          deletionPending,
        );
      throw new AuthMutationIndeterminateError(message, confirmedSnapshot);
    } finally {
      identityMutationPending = Math.max(0, identityMutationPending - 1);
      release();
    }
  };

  /** 校验 OAuth 导航仅使用 HTTP(S) 地址。 */
  const getSafeOAuthUrl = (value: string): string | null => {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:"
        ? url.toString()
        : null;
    } catch {
      return null;
    }
  };

  const coordinator: AuthSessionCoordinator = {
    getSnapshot: () => snapshot,
    getCredentialSnapshot: () => readCredentialSnapshot(),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    subscribeIdentityLifecycle(listener) {
      lifecycleListeners.add(listener);
      return () => lifecycleListeners.delete(listener);
    },
    bootstrap: () => signOutPending
      ? coordinator.signOut().then(() => snapshot)
      : recoverGeneration(snapshot.generation),
    refresh: (options) =>
      recoverGeneration(
        snapshot.generation,
        false,
        false,
        options?.allowRetain ?? true,
      ),
    async ensureCredential() {
      if (
        identityMutationPending > 0 ||
        snapshot.operation === "signingIn" ||
        snapshot.operation === "redirecting" ||
        snapshot.operation === "signingOut" ||
        snapshot.operation === "deleting"
      ) {
        return null;
      }
      const current = coordinator.getCredentialSnapshot();
      const jwtFresh =
        credential.jwtToken &&
        credential.jwtExpiresAt !== null &&
        credential.jwtExpiresAt - clock.now() > JWT_REFRESH_WINDOW_MS;
      if (current && jwtFresh) return current;
      await recoverGeneration(snapshot.generation);
      return coordinator.getCredentialSnapshot();
    },
    settleUnauthorized(rejectedCredential) {
      if (
        unauthorizedSettlementFlight?.userId === rejectedCredential.userId &&
        unauthorizedSettlementFlight.generation === rejectedCredential.generation &&
        unauthorizedSettlementFlight.version === rejectedCredential.version
      ) {
        return unauthorizedSettlementFlight.promise;
      }
      const current = coordinator.getCredentialSnapshot();
      if (
        !current ||
        current.userId !== rejectedCredential.userId ||
        current.generation !== rejectedCredential.generation ||
        current.version !== rejectedCredential.version
      ) {
        return Promise.resolve({ accepted: false, snapshot });
      }
      const promise = (async (): Promise<AuthUnauthorizedSettlement> => {
        const generation = coordinator.invalidateIdentity("unauthorized");
        const settled = await recoverGeneration(generation);
        return { accepted: true, snapshot: settled };
      })().finally(() => {
        if (
          unauthorizedSettlementFlight?.userId === rejectedCredential.userId &&
          unauthorizedSettlementFlight.generation === rejectedCredential.generation &&
          unauthorizedSettlementFlight.version === rejectedCredential.version
        ) {
          unauthorizedSettlementFlight = null;
        }
      });
      unauthorizedSettlementFlight = {
        userId: rejectedCredential.userId,
        generation: rejectedCredential.generation,
        version: rejectedCredential.version,
        promise,
      };
      return promise;
    },
    signInWithEmail(email, password) {
      if (signOutPending) return Promise.resolve({
        success: false, error: { message: "请先完成退出，再重新登录。" },
      });
      if (loginFlight) return loginFlight;
      loginFlight = coordinator.runCookieMutation(async (signal): Promise<AuthActionResult> => {
        const generation = coordinator.invalidateIdentity("email-sign-in");
        publish({ operation: "signingIn", error: null });
        const result = await deps.provider.signInEmail(
          email,
          password,
          generation,
          signal,
        );
        if (generation !== snapshot.generation) {
          return { success: false, error: { message: "登录状态已变化，请重试。" } };
        }
        coordinator.commitProviderHeaders(generation, result.response);
        if (result.error) {
          const message = getErrorMessage(result.error, "邮箱登录失败，请检查邮箱和密码。");
          const code = getErrorCode(result.error);
          publish({ operation: "idle", status: "anonymous", error: message, initialized: true });
          return { success: false, error: { code, message } };
        }
        publish({ operation: "redirecting", error: null });
        const confirmed = await recoverGeneration(generation, true);
        if (confirmed.status !== "authenticated") {
          return {
            success: false,
            error: { message: confirmed.error ?? "登录响应未包含完整会话，请重试。" },
          };
        }
        deps.broadcast?.publish("identity-changed");
        return { success: true, data: result.data };
      }).catch((error: unknown) => {
        const message = getErrorMessage(error, "邮箱登录失败，请检查邮箱和密码。");
        return { success: false, error: { message } };
      }).finally(() => {
        loginFlight = null;
      });
      return loginFlight;
    },
    async startOAuth(provider, callbackURL, errorCallbackURL) {
      if (snapshot.operation !== "idle" || identityMutationPending > 0) {
        return { success: false, error: { message: "请等待当前认证操作完成。" } };
      }
      let popup: OAuthPopup | null | undefined = null;
      let unsubscribe: (() => void) | undefined;
      let oauthGeneration: number | null = null;
      try {
        popup = provider === "github" ? deps.openOAuthPopup?.() : null;
        const started = await coordinator.runCookieMutation(async (signal) => {
          const generation = coordinator.invalidateIdentity(`oauth-${provider}`);
          oauthGeneration = generation;
          publish({ operation: "redirecting", error: null });
          const result: AuthProviderSignInResult = await deps.provider.signInSocial(
            provider,
            popup?.callbackURL ?? callbackURL,
            popup?.callbackURL ?? errorCallbackURL,
            generation,
            signal,
          );
          if (generation !== snapshot.generation) {
            return { success: false, error: { message: "登录状态已变化，请重试。" } };
          }
          coordinator.commitProviderHeaders(generation, result.response);
          if (result.error || !result.response.ok) {
            const source = result.error ?? result.data;
            const message = getErrorMessage(source, `${provider} 登录发起失败，请稍后重试。`);
            publish({ operation: "idle", status: "anonymous", error: message, initialized: true });
            return { success: false, error: { code: getErrorCode(source), message } };
          }
          const redirectUrl = result.redirectUrl
            ? getSafeOAuthUrl(result.redirectUrl)
            : null;
          if (!redirectUrl) {
            const message = "OAuth 服务未返回安全的跳转地址。";
            publish({ operation: "idle", status: "unavailable", error: message, initialized: true });
            return { success: false, error: { message } };
          }
          if (navigationGeneration !== generation) {
            navigationGeneration = generation;
            (popup?.navigate ?? deps.navigate ?? ((url: string) => window.location.assign(url)))(redirectUrl);
          }
          return { success: true, data: result.data };
        });
        if (!started.success || !popup) return started;
        const activePopup = popup;
        unsubscribe = coordinator.subscribe(() => {
          if (oauthGeneration !== snapshot.generation) activePopup.dispose();
        });
        // 等待用户授权不占用十秒 Cookie 请求锁；完成后再确认一次服务端会话。
        const outcome = await popup.result;
        if (oauthGeneration !== snapshot.generation) {
          return { success: false, error: { message: "登录状态已变化，请重试。" } };
        }
        if (outcome !== "completed") {
          publish({ status: "anonymous", operation: "idle", error: null, initialized: true });
          // 取消是用户主动行为：静默返回，不发布可见错误，登录页按 OAUTH_CANCELLED 抑制提示；超时与失败仍提示。
          if (outcome === "cancelled") {
            return { success: false, error: { code: "OAUTH_CANCELLED", message: "用户取消了 GitHub 授权。" } };
          }
          return { success: false, error: {
            code: "OAUTH_FAILED",
            message: outcome === "timeout" ? "GitHub 登录等待超时，请重试。" : "GitHub 授权未完成，请重试。",
          } };
        }
        const confirmed = await recoverGeneration(oauthGeneration);
        if (confirmed.generation !== oauthGeneration || confirmed.status !== "authenticated") {
          return { success: false, error: { message: confirmed.error ?? "暂时无法确认登录状态，请重试。" } };
        }
        deps.broadcast?.publish("identity-changed");
        return { success: true };
      } catch (error) {
        const message = getErrorMessage(error, `${provider} 登录发起失败，请稍后重试。`);
        if (!(error instanceof AuthMutationIndeterminateError) &&
          (oauthGeneration === null || oauthGeneration === snapshot.generation)) {
          publish({ operation: "idle", status: "unavailable", error: message, initialized: true });
        }
        return { success: false, error: { message } };
      } finally {
        unsubscribe?.();
        popup?.dispose();
      }
    },
    async signOut() {
      if (snapshot.operation === "signingOut") {
        return { success: false, error: { message: "正在退出，请稍候。" } };
      }
      signOutPending = true;
      const generation = coordinator.invalidateIdentity("sign-out");
      publish({ status: "anonymous", operation: "signingOut", user: null, error: null, initialized: true });
      try {
        return await coordinator.runCookieMutation(async (signal) => {
          const response = await deps.provider.signOut(generation, signal);
          if (generation !== snapshot.generation) {
            return { success: false, error: { message: "退出期间登录状态已变化，请重试。" } };
          }
          if (!response.ok) {
            publish({
              status: "anonymous",
              user: null,
              operation: "signOutFailed",
              error: SIGN_OUT_UNCONFIRMED_MESSAGE,
              initialized: true,
            });
            return { success: false, error: { message: SIGN_OUT_UNCONFIRMED_MESSAGE } };
          }
          signOutPending = false;
          publish({
            status: "anonymous",
            user: null,
            operation: "idle",
            error: null,
            initialized: true,
          });
          deps.broadcast?.publish("signed-out");
          return { success: true };
        });
      } catch (error) {
        if (
          error instanceof AuthMutationIndeterminateError &&
          error.confirmedSnapshot.status === "anonymous"
        ) {
          signOutPending = false;
          publish({ status: "anonymous", user: null, operation: "idle", error: null, initialized: true });
          deps.broadcast?.publish("signed-out");
          return { success: true };
        }
        publish({
          status: "anonymous",
          user: null,
          operation: "signOutFailed",
          error: SIGN_OUT_UNCONFIRMED_MESSAGE,
          initialized: true,
        });
        return { success: false, error: { message: SIGN_OUT_UNCONFIRMED_MESSAGE } };
      }
    },
    invalidateIdentity(reason) {
      const generation = snapshot.generation + 1;
      clearCredential();
      recoveryFlight = null;
      publish({
        generation,
        status: "checking",
        operation: "idle",
        error: null,
      });
      lifecycleListeners.forEach((listener) => listener({ reason, generation }));
      return generation;
    },
    confirmAnonymous(reason) {
      deletionPending = false;
      coordinator.invalidateIdentity(reason);
      publish({
        status: "anonymous",
        user: null,
        operation: "idle",
        error: null,
        initialized: true,
      });
      deps.broadcast?.publish("identity-changed");
    },
    commitProviderHeaders(generation, response) {
      if (generation !== snapshot.generation) return false;
      const accessToken = response.headers.get("set-auth-token");
      const jwtToken = response.headers.get("set-auth-jwt");
      if (!accessToken && !jwtToken) return true;
      credential = {
        accessToken: accessToken ?? credential.accessToken,
        jwtToken: jwtToken ?? credential.jwtToken,
        jwtExpiresAt: jwtToken ? parseJwtExpiry(jwtToken) : credential.jwtExpiresAt,
        version: credential.version + 1,
      };
      return true;
    },
    setOperation(operation, error = null) {
      publish({ operation, error });
    },
    beginAccountDeletion() {
      const captured = readCredentialSnapshot(true);
      if (!captured) return null;
      const generation = snapshot.generation + 1;
      deletionPending = true;
      clearCredential();
      recoveryFlight = null;
      publish({
        generation,
        operation: "deleting",
        error: null,
      });
      lifecycleListeners.forEach((listener) =>
        listener({ reason: "account-deletion", generation }),
      );
      return captured;
    },
    async completeAccountDeletionFailure(message) {
      const confirmed = await recoverGeneration(snapshot.generation, true, true);
      if (confirmed.status === "authenticated") {
        publish({ operation: "idle", error: message });
      }
    },
    runCookieMutation: runSerializedMutation,
  };

  deps.broadcast?.subscribe((reason) => {
    if (signOutPending) return;
    coordinator.invalidateIdentity(`broadcast:${reason}`);
    void coordinator.refresh();
  });

  return coordinator;
};

/** 浏览器进程内唯一匿名身份广播器。 */
const browserIdentityBroadcast = createBrowserIdentityBroadcast();
const SIGN_OUT_PENDING_KEY = "nubbi.auth.sign-out-pending";

/** @returns 刷新页面后是否仍需完成用户已发起的退出操作。 */
const readSignOutPending = (): boolean => {
  try {
    return window.sessionStorage.getItem(SIGN_OUT_PENDING_KEY) === "1";
  } catch {
    return false;
  }
};

/**
 * 在 OAuth 离站前留下不含用户或凭证的一次性标记，回调确认后再通知其他标签页。
 * @param url 已由协调器校验过的 OAuth 跳转地址。
 * @returns 无返回值。
 */
const navigateForBrowserOAuth = (url: string): void => {
  try {
    window.sessionStorage.setItem(OAUTH_IDENTITY_PENDING_KEY, "1");
  } catch {
    // SessionStorage 不可用不阻断 OAuth 主流程。
  }
  window.location.assign(url);
};

/** 浏览器进程内唯一认证协调器。 */
export const authSessionCoordinator = createAuthSessionCoordinator({
  provider: browserAuthProvider,
  broadcast: browserIdentityBroadcast,
  navigate: navigateForBrowserOAuth,
  openOAuthPopup,
  initialSignOutPending: readSignOutPending(),
});

authSessionCoordinator.subscribe(() => {
  if (typeof window === "undefined") return;
  const snapshot = authSessionCoordinator.getSnapshot();
  try {
    if (snapshot.operation === "signingOut" || snapshot.operation === "signOutFailed") {
      window.sessionStorage.setItem(SIGN_OUT_PENDING_KEY, "1");
    } else if (snapshot.status === "anonymous" && snapshot.operation === "idle") {
      window.sessionStorage.removeItem(SIGN_OUT_PENDING_KEY);
    }
  } catch {
    // 存储不可用时仍正常完成当前页面内的退出。
  }
  if (!snapshot.initialized || snapshot.status === "checking") return;
  try {
    if (window.sessionStorage.getItem(OAUTH_IDENTITY_PENDING_KEY) !== "1") {
      return;
    }
    if (snapshot.status === "authenticated") {
      browserIdentityBroadcast.publish("identity-changed");
    }
    if (snapshot.status === "authenticated" || snapshot.status === "anonymous") {
      window.sessionStorage.removeItem(OAUTH_IDENTITY_PENDING_KEY);
    }
  } catch {
    // 标记读写失败不改变已确认的会话状态。
  }
});

/** @returns 浏览器唯一 UI 会话快照。 */
export const getAuthSessionSnapshot = (): AuthSessionSnapshot =>
  authSessionCoordinator.getSnapshot();

/**
 * 订阅浏览器唯一 UI 会话快照。
 * @param listener 快照变化监听器。
 * @returns 取消订阅函数。
 */
export const subscribeAuthSession = (listener: () => void): (() => void) =>
  authSessionCoordinator.subscribe(listener);

/** @returns React 可订阅的浏览器唯一 UI 会话快照。 */
export const useAuthSessionSnapshot = (): AuthSessionSnapshot =>
  useSyncExternalStore(
    subscribeAuthSession,
    getAuthSessionSnapshot,
    getAuthSessionSnapshot,
  );

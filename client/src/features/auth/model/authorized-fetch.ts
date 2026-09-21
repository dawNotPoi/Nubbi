import { getApiBaseUrl } from "@/utils/env";
import type { AuthCredentialSnapshot, AuthSessionSnapshot } from "./types";
import {
  authSessionCoordinator,
  type AuthIdentityLifecycleEvent,
  type AuthRefreshOptions,
} from "./session-coordinator";

const AUTH_REJECTED_HEADER = "X-Auth-Rejected";
const BEFORE_HANDLER_REJECTION = "before-handler";

/** 授权请求依赖的最小会话协调器契约。 */
export interface AuthorizedFetchCoordinator {
  /** @returns 新鲜凭证或 null。 */
  ensureCredential(): Promise<AuthCredentialSnapshot | null>;
  /** @returns 当前凭证或 null。 */
  getCredentialSnapshot(): AuthCredentialSnapshot | null;
  /**
   * 刷新当前会话。
   * @param options 暂时失败时是否允许保留已被服务端拒绝的凭证。
   * @returns 刷新后的会话快照。
   */
  refresh(options?: AuthRefreshOptions): Promise<AuthSessionSnapshot>;
  /**
   * 使最终认证拒绝失效一次并受控确认会话。
   * @param rejectedCredential 被最终拒绝的原请求凭证。
   * @returns 是否接受拒绝及收敛后的快照。
   */
  settleUnauthorized(
    rejectedCredential: AuthCredentialSnapshot,
  ): Promise<{ accepted: boolean; snapshot: AuthSessionSnapshot }>;
  /**
   * 订阅身份代次变化，用于中止旧账号请求。
   * @param listener 身份变化监听器。
   * @returns 取消订阅函数。
   */
  subscribeIdentityLifecycle(
    listener: (event: AuthIdentityLifecycleEvent) => void,
  ): () => void;
}

/** 业务请求响应到达时原身份代次已经失效。 */
export class StaleAuthGenerationError extends Error {
  /** 创建可识别的旧代次错误。 */
  constructor() {
    super("请求所属的登录状态已经变化。");
    this.name = "StaleAuthGenerationError";
  }
}

/** 响应拒绝的是已被同账号新版本替换的旧凭证。 */
export class StaleAuthCredentialError extends Error {
  /** 创建可识别的旧凭证响应错误。 */
  constructor() {
    super("请求使用的登录凭证已更新。");
    this.name = "StaleAuthCredentialError";
  }
}

/** 当前会话无法提供业务请求凭证。 */
export class AuthCredentialUnavailableError extends Error {
  /** 创建可识别的凭证不可用错误。 */
  constructor() {
    super("暂时无法确认登录状态，请重试。");
    this.name = "AuthCredentialUnavailableError";
  }
}

/**
 * 判断请求体能否在认证前置拒绝后安全地再次交给 fetch。
 * @param body 原始请求体。
 * @returns 是否属于浏览器可重复消费的请求体形状。
 */
export const isReplayableRequestBody = (
  body: RequestInit["body"],
): boolean => {
  if (body === undefined || body === null || typeof body === "string") {
    return true;
  }
  if (
    body instanceof URLSearchParams ||
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof ArrayBuffer
  ) {
    return true;
  }
  return ArrayBuffer.isView(body);
};

/**
 * 解析相对或绝对 API 地址。
 * @param url 调用方传入的地址。
 * @returns 可交给 fetch 的完整地址。
 */
const resolveApiUrl = (url: string): string => {
  const baseUrl = getApiBaseUrl();
  if (/^https?:\/\//i.test(url)) {
    const target = new URL(url);
    const authority = new URL(baseUrl || window.location.origin);
    if (target.origin !== authority.origin) {
      throw new Error("授权请求不能发送到站外地址。");
    }
    return target.toString();
  }
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${baseUrl}${path}`;
};

/**
 * 判断响应是否由服务端在业务处理前因认证失败而拒绝。
 * @param response 服务端响应。
 * @returns 是否包含约定的前置拒绝标记。
 */
const isBeforeHandlerRejection = (response: Response): boolean =>
  response.headers.get(AUTH_REJECTED_HEADER)?.trim().toLowerCase() ===
  BEFORE_HANDLER_REJECTION;

/**
 * 判断请求是否允许在刷新凭证后重放。
 * @param method HTTP 方法。
 * @param body 原始请求体。
 * @returns 只读请求或请求体可重放的写请求返回 true。
 */
const canReplayRequest = (
  method: string,
  body: RequestInit["body"],
): boolean => {
  const normalizedMethod = method.toUpperCase();
  return (
    normalizedMethod === "GET" ||
    normalizedMethod === "HEAD" ||
    isReplayableRequestBody(body)
  );
};

/**
 * 校验当前身份仍与请求发起时一致。
 * @param coordinator 会话协调器。
 * @param captured 请求发起时的凭证。
 * @returns 当前同身份凭证。
 * @throws 身份或代次变化时抛出 StaleAuthGenerationError。
 */
const requireSameIdentity = (
  coordinator: AuthorizedFetchCoordinator,
  captured: AuthCredentialSnapshot,
): AuthCredentialSnapshot => {
  const current = coordinator.getCredentialSnapshot();
  if (
    current?.userId !== captured.userId ||
    current.generation !== captured.generation
  ) {
    throw new StaleAuthGenerationError();
  }
  return current;
};

/**
 * 创建携带外部中止与身份代次中止语义的请求控制器。
 * @param coordinator 会话协调器。
 * @param captured 请求发起时的凭证。
 * @param externalSignal 调用方可选中止信号。
 * @returns 合并后的 signal 与释放监听器函数。
 */
const createRequestAbortScope = (
  coordinator: AuthorizedFetchCoordinator,
  captured: AuthCredentialSnapshot,
  externalSignal?: AbortSignal | null,
): { signal: AbortSignal; cleanup: () => void } => {
  const controller = new AbortController();
  let cleaned = false;
  const abortFromExternal = (): void => {
    controller.abort(externalSignal?.reason);
  };
  if (externalSignal?.aborted) {
    abortFromExternal();
  } else {
    externalSignal?.addEventListener("abort", abortFromExternal, {
      once: true,
    });
  }
  const unsubscribe = coordinator.subscribeIdentityLifecycle((event) => {
    if (event.generation !== captured.generation) {
      controller.abort(
        new DOMException("登录状态已变化，请求已取消。", "AbortError"),
      );
    }
  });
  return {
    signal: controller.signal,
    cleanup: () => {
      if (cleaned) return;
      cleaned = true;
      unsubscribe();
      externalSignal?.removeEventListener("abort", abortFromExternal);
    },
  };
};

/**
 * 为重建的响应及其 clone 保留底层 fetch 响应元数据。
 * @param target 需要补齐元数据的 Response。
 * @param source 提供只读元数据的底层 Response。
 * @returns 保持原生 Response 实例和 body 行为的响应。
 */
const preserveResponseMetadata = (
  target: Response,
  source: Response,
): Response => {
  Object.defineProperties(target, {
    clone: {
      configurable: true,
      value: (): Response =>
        preserveResponseMetadata(
          Reflect.apply(Response.prototype.clone, target, []) as Response,
          source,
        ),
    },
    redirected: {
      configurable: true,
      get: () => source.redirected,
    },
    type: {
      configurable: true,
      get: () => source.type,
    },
    url: {
      configurable: true,
      get: () => source.url,
    },
  });
  return target;
};

/**
 * 让身份代次与外部中止信号持续覆盖响应体读取阶段。
 * @param response 已返回响应头的原始响应。
 * @param cleanup 响应体结束或取消时释放监听器。
 * @returns 保留状态、状态文本与响应头的可消费响应。
 */
const bindResponseLifetime = (
  response: Response,
  cleanup: () => void,
): Response => {
  if (!response.body) {
    cleanup();
    return response;
  }
  const reader = response.body.getReader();
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const chunk = await reader.read();
        if (chunk.done) {
          cleanup();
          controller.close();
          return;
        }
        controller.enqueue(chunk.value);
      } catch (error) {
        cleanup();
        controller.error(error);
      }
    },
    async cancel(reason) {
      try {
        await reader.cancel(reason);
      } finally {
        cleanup();
      }
    },
  });
  return preserveResponseMetadata(
    new Response(body, {
      headers: response.headers,
      status: response.status,
      statusText: response.statusText,
    }),
    response,
  );
};

/**
 * 创建带账号代次隔离和一次认证恢复的 fetch。
 * @param coordinator 可注入的会话协调器。
 * @param fetcher 可注入的底层 fetch。
 * @param urlResolver 可注入的 URL 解析函数。
 * @returns 接收 API 地址与 fetch 参数的授权请求函数。
 */
export const createAuthorizedFetch = (
  coordinator: AuthorizedFetchCoordinator,
  fetcher: typeof fetch = fetch,
  urlResolver: (url: string) => string = resolveApiUrl,
) => async (url: string, init: RequestInit = {}): Promise<Response> => {
  const captured = await coordinator.ensureCredential();
  if (!captured) throw new AuthCredentialUnavailableError();

  const method = (init.method ?? "GET").toUpperCase();
  const abortScope = createRequestAbortScope(
    coordinator,
    captured,
    init.signal,
  );
  const send = async (
    credential: AuthCredentialSnapshot,
  ): Promise<Response> => {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${credential.token}`);
    return fetcher(urlResolver(url), {
      ...init,
      credentials: init.credentials ?? "omit",
      headers,
      signal: abortScope.signal,
    });
  };

  let responseHandedOff = false;
  const handOffResponse = (response: Response): Response => {
    responseHandedOff = true;
    return bindResponseLifetime(response, abortScope.cleanup);
  };

  try {
    requireSameIdentity(coordinator, captured);
    let response = await send(captured);
    const credentialAtResponse = requireSameIdentity(coordinator, captured);
    if (response.status !== 401) return handOffResponse(response);

    const rejectedBeforeHandler = isBeforeHandlerRejection(response);
    const replayable = canReplayRequest(method, init.body);
    if (!rejectedBeforeHandler || !replayable) {
      if (rejectedBeforeHandler) {
        requireSameIdentity(coordinator, captured);
        abortScope.cleanup();
        const settlement = await coordinator.settleUnauthorized(captured);
        if (!settlement.accepted) {
          const current = coordinator.getCredentialSnapshot();
          if (
            current?.userId === captured.userId &&
            current.generation === captured.generation &&
            current.version !== captured.version
          ) {
            throw new StaleAuthCredentialError();
          }
          throw new StaleAuthGenerationError();
        }
      }
      return handOffResponse(response);
    }

    await response.body?.cancel().catch(() => undefined);
    let retryCredential = credentialAtResponse;
    if (credentialAtResponse.version === captured.version) {
      await coordinator.refresh({ allowRetain: false });
      retryCredential = requireSameIdentity(coordinator, captured);
    }

    response = await send(retryCredential);
    requireSameIdentity(coordinator, captured);
    if (response.status === 401 && isBeforeHandlerRejection(response)) {
      abortScope.cleanup();
      const settlement = await coordinator.settleUnauthorized(retryCredential);
      if (!settlement.accepted) {
        const current = coordinator.getCredentialSnapshot();
        if (
          current?.userId === retryCredential.userId &&
          current.generation === retryCredential.generation &&
          current.version !== retryCredential.version
        ) {
          throw new StaleAuthCredentialError();
        }
        throw new StaleAuthGenerationError();
      }
    }
    return handOffResponse(response);
  } finally {
    if (!responseHandedOff) abortScope.cleanup();
  }
};

/** 使用浏览器唯一协调器的授权 fetch。 */
export const authorizedFetch = createAuthorizedFetch(authSessionCoordinator);

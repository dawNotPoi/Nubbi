import { getErrorStatusCode } from "@/common/http-error";
import { resolveAuthContext } from "@/services/auth/credential-resolver";
import { AuthBackendUnavailableError } from "@/services/auth/types";
import type {
  AuthRequest,
  RequestAuthContext,
} from "@/services/auth/types";
import type { NextFunction, Request, Response } from "express";
import type { IncomingHttpHeaders } from "node:http";
import { trackAuthenticatedMutation } from "./account-mutation";

/** 客户端据此判断 401 是否发生在业务处理之前。 */
export const AUTH_REJECTED_HEADER = "X-Auth-Rejected";
/** 认证入口拒绝标记的稳定值。 */
export const BEFORE_HANDLER_REJECTION = "before-handler";

/**
 * 返回业务处理前的 401，并附加可安全重放判断所需的响应头。
 * @param res Express 响应。
 * @returns 无返回值。
 */
export const unauthorized = (res: Response): void => {
  res.setHeader(AUTH_REJECTED_HEADER, BEFORE_HANDLER_REJECTION);
  res.status(401).json({ code: 0, message: "Unauthorized", data: null });
};

/**
 * 将认证领域错误映射为稳定的 HTTP 语义。
 * @param res Express 响应。
 * @param error 认证解析或账号写锁抛出的错误。
 * @param next Express 后续错误处理器。
 * @returns 无返回值。
 */
export const sendAuthenticationError = (
  res: Response,
  error: unknown,
  next: NextFunction,
): void => {
  const status = getErrorStatusCode(error);
  if (status === 429) {
    const message =
      error instanceof Error ? error.message : "请求过于频繁，请稍后重试";
    res.status(429).json({ code: 0, message, data: null });
    return;
  }
  if (status === 400 || status === 401 || status === 403) {
    unauthorized(res);
    return;
  }
  if (status === 409) {
    next(error);
    return;
  }

  next(
    error instanceof AuthBackendUnavailableError
      ? error
      : new AuthBackendUnavailableError(error),
  );
};

/**
 * 将认证上下文附加到请求对象，供后续处理器读取。
 * @param req Express 请求。
 * @param context 已验证的统一认证上下文。
 * @returns 无返回值。
 */
export const attachAuthContext = (
  req: Request,
  context: RequestAuthContext,
): void => {
  const authRequest = req as AuthRequest;
  authRequest.user = context.user;
  authRequest.authContext = context;
};

/**
 * 从请求头解析 Session 或 JWT，不接受 API Key。
 * @param headers Node.js 请求头。
 * @returns 已验证的 Session/JWT 上下文；无效凭证返回 null。
 */
export const getSessionAuthContextFromHeaders = async (
  headers: IncomingHttpHeaders,
): Promise<RequestAuthContext | null> =>
  resolveAuthContext({ headers, allowApiKey: false });

/**
 * 从 Express 请求解析 Session 或 JWT。
 * @param req Express 请求。
 * @returns 已验证的 Session/JWT 上下文；无效凭证返回 null。
 */
export const getSessionAuthContext = async (
  req: Request,
): Promise<RequestAuthContext | null> =>
  getSessionAuthContextFromHeaders(req.headers);

/**
 * 通过统一 resolver 校验单个 API Key。
 * @param key API Key 明文。
 * @returns API Key 认证上下文；无效凭证返回 null。
 */
export const getApiKeyContext = async (
  key: string,
): Promise<RequestAuthContext | null> =>
  resolveAuthContext({
    headers: { "x-api-key": key },
    allowApiKey: true,
  });

/**
 * 解析允许 API Key 的请求；已有上下文直接复用。
 * @param req Express 请求。
 * @returns 已验证的统一认证上下文；无效凭证返回 null。
 */
export const authenticateWithApiKey = async (
  req: Request,
): Promise<RequestAuthContext | null> => {
  const existingContext = (req as AuthRequest).authContext;
  return (
    existingContext ??
    resolveAuthContext({ headers: req.headers, allowApiKey: true })
  );
};

/**
 * Session/JWT 认证传输适配器：附加上下文并登记账号变更锁。
 * @param req Express 请求。
 * @param res Express 响应。
 * @param next Express 后续处理器。
 * @returns 无返回值。
 */
export const authenticateBySession = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const context = await getSessionAuthContext(req);
    if (!context) return void unauthorized(res);
    attachAuthContext(req, context);
    trackAuthenticatedMutation(req, res, context.user.id);
    next();
  } catch (error) {
    sendAuthenticationError(res, error, next);
  }
};

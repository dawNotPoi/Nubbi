/** 业务异常类型：携带 HTTP 状态码和可选数据，供统一错误处理使用 */
export class HttpError extends Error {
  readonly status: number;
  readonly data?: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.data = data;
  }
}

/** 快捷创建 HttpError 的辅助函数 */
export const httpError = (
  status: number,
  message: string,
  data?: unknown,
): HttpError => new HttpError(status, message, data);

/** 判断值是否为合法的 HTTP 错误状态码（400-599） */
const isHttpErrorStatus = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= 400 &&
  value <= 599;

/** 兼容本地 HttpError 与 Better Auth APIError 的状态码形态。 */
export const getErrorStatusCode = (
  error: unknown,
  fallback = 500,
): number => {
  if (!error || typeof error !== "object") return fallback;

  if ("statusCode" in error && isHttpErrorStatus(error.statusCode)) {
    return error.statusCode;
  }
  if ("status" in error && isHttpErrorStatus(error.status)) {
    return error.status;
  }
  return fallback;
};

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

export const httpError = (
  status: number,
  message: string,
  data?: unknown,
): HttpError => new HttpError(status, message, data);

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

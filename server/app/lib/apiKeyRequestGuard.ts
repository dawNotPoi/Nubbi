import { APIError, createAuthMiddleware } from "better-auth/api";

/** 外部请求禁止直接指定归属字段的 API Key 端点 */
const API_KEY_WRITE_PATHS = new Set([
  "/api-key/create",
  "/api-key/update",
]);

/** 安全地检查对象是否拥有指定自有属性 */
const hasOwnField = (value: unknown, field: string): boolean =>
  typeof value === "object" &&
  value !== null &&
  Object.prototype.hasOwnProperty.call(value, field);

/** 仅允许使用项目注册的默认 API Key 配置 */
const isNonDefaultConfig = (body: unknown): boolean => {
  if (!hasOwnField(body, "configId")) return false;
  return (body as { configId?: unknown }).configId !== "default";
};

/** 判断外部请求是否试图写入仅限服务端的 API Key 字段 */
export const shouldRejectExternalApiKeyServerFields = ({
  body,
  external,
  path,
}: {
  body: unknown;
  external: boolean;
  path: string;
}): boolean =>
  external &&
  (API_KEY_WRITE_PATHS.has(path) &&
      (["userId", "referenceId", "organizationId"].some((field) =>
        hasOwnField(body, field),
      ) ||
        isNonDefaultConfig(body)) ||
    path === "/api-key/update" && hasOwnField(body, "metadata"));

/** Better Auth 中间件：拦截外部请求对 API Key 服务端字段的写入 */
export const guardExternalApiKeyServerFields = createAuthMiddleware(
  async (context) => {
    if (shouldRejectExternalApiKeyServerFields({
      body: context.body,
      external: Boolean(context.request),
      path: context.path,
    })) {
      throw new APIError("BAD_REQUEST", {
        message: "API key ownership and policy fields are server-only",
      });
    }
  },
);

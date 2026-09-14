import { APIError, createAuthMiddleware } from "better-auth/api";

/** 外部请求禁止直接指定 userId 或 metadata 的 API Key 端点 */
const USER_ID_API_KEY_PATHS = new Set([
  "/api-key/create",
  "/api-key/update",
]);

/** 安全地检查对象是否拥有指定自有属性 */
const hasOwnField = (value: unknown, field: string): boolean =>
  typeof value === "object" &&
  value !== null &&
  Object.prototype.hasOwnProperty.call(value, field);

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
  (USER_ID_API_KEY_PATHS.has(path) && hasOwnField(body, "userId") ||
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

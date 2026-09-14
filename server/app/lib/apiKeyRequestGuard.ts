import { APIError, createAuthMiddleware } from "better-auth/api";

const USER_ID_API_KEY_PATHS = new Set([
  "/api-key/create",
  "/api-key/update",
]);

const hasOwnField = (value: unknown, field: string): boolean =>
  typeof value === "object" &&
  value !== null &&
  Object.prototype.hasOwnProperty.call(value, field);

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

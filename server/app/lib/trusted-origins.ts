import env from "@/lib/env";

/** 已配置的受信任来源（CLIENT_URL、BETTER_AUTH_URL），仅允许其 origin */
const configuredTrustedOrigins = new Set(
  [env.CLIENT_URL, env.BETTER_AUTH_URL].map((value) => new URL(value).origin),
);

/** 本地开发环境允许的 hostname，生产环境不生效 */
const localDevelopmentHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** 安全地解析 URL，解析失败返回 null */
const parseUrl = (value: string): URL | null => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

/** 判断请求来源是否为受信任的 Origin，用于 CORS 和 Better Auth 安全策略 */
export const isTrustedOrigin = (origin?: string): boolean => {
  if (!origin) return true;

  const url = parseUrl(origin);
  if (!url) return false;

  if (configuredTrustedOrigins.has(url.origin)) return true;

  return (
    env.NODE_ENV === "development" &&
    url.protocol === "http:" &&
    localDevelopmentHosts.has(url.hostname)
  );
};

/** 解析 Better Auth 所需的受信任来源列表，动态包含当前请求的 origin */
export const resolveAuthTrustedOrigins = (request?: Request): string[] => {
  const trustedOrigins = new Set(configuredTrustedOrigins);
  const requestOrigin =
    request?.headers.get("origin") || request?.headers.get("referer");

  if (!requestOrigin || !isTrustedOrigin(requestOrigin)) {
    return [...trustedOrigins];
  }

  const url = parseUrl(requestOrigin);
  if (url) trustedOrigins.add(url.origin);

  return [...trustedOrigins];
};

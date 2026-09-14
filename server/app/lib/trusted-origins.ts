import env from "@/lib/env";

const configuredTrustedOrigins = new Set(
  [env.CLIENT_URL, env.BETTER_AUTH_URL].map((value) => new URL(value).origin),
);

const localDevelopmentHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

const parseUrl = (value: string): URL | null => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

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

export const resolveAuthTrustedOrigins = (request: Request): string[] => {
  const trustedOrigins = new Set(configuredTrustedOrigins);
  const requestOrigin =
    request.headers.get("origin") || request.headers.get("referer");

  if (!requestOrigin || !isTrustedOrigin(requestOrigin)) {
    return [...trustedOrigins];
  }

  const url = parseUrl(requestOrigin);
  if (url) trustedOrigins.add(url.origin);

  return [...trustedOrigins];
};

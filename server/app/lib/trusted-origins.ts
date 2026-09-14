import env from "@/lib/env";

const trustedOrigins = new Set(
  [env.CLIENT_URL, env.BETTER_AUTH_URL].map((value) => new URL(value).origin),
);

export const isTrustedOrigin = (origin?: string): boolean => {
  if (!origin) return true;

  try {
    return trustedOrigins.has(new URL(origin).origin);
  } catch {
    return false;
  }
};

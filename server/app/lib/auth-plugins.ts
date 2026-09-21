import { apiKey } from "@better-auth/api-key";
import { bearer, jwt } from "better-auth/plugins";
import { AUTH_JWT_ALGORITHMS } from "@/services/auth/jwt-verifier";

/**
 * 标准化认证服务 URL，确保签发与校验使用完全相同的 issuer/audience。
 * @param value BETTER_AUTH_URL 原始配置。
 * @returns 移除查询、片段与尾部斜杠后的绝对 URL。
 */
export const normalizeAuthJwtAuthority = (value: string): string => {
  const url = new URL(value);
  url.search = "";
  url.hash = "";
  url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  return url.toString().replace(/\/$/, "");
};

/**
 * 创建认证插件配置，供服务启动与只读数据库检查共享。
 * @param authority 标准化后的 JWT issuer 与 audience。
 * @returns 与线上认证实例一致的插件列表。
 */
export const createAuthPlugins = (authority: string) => [
  bearer(),
  jwt({
    jwks: { keyPairConfig: { alg: AUTH_JWT_ALGORITHMS[0] } },
    jwt: {
      issuer: authority,
      audience: authority,
      expirationTime: "15m",
    },
  }),
  apiKey({
    configId: "default",
    references: "user",
    defaultPrefix: "nb_",
    enableMetadata: true,
    maximumNameLength: 100,
    enableSessionForAPIKeys: false,
    keyExpiration: { defaultExpiresIn: null },
    rateLimit: { enabled: true, timeWindow: 60 * 1000, maxRequests: 300 },
  }),
];

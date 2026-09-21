import {
  decodeProtectedHeader,
  errors,
  importJWK,
  jwtVerify,
  type JWK,
} from "jose";

/** JWT 校验默认接受的签名算法，与 Better Auth 签发配置保持一致。 */
export const AUTH_JWT_ALGORITHMS = ["EdDSA"] as const;

/** 可供校验器按 kid 精确选择的公开 JWK。 */
export type AuthPublicJwk = JWK & {
  kid: string;
  alg?: string;
};

/** 可注入的 JWT 校验依赖，用于隔离验证密钥刷新与声明约束。 */
export type AuthJwtVerifierDependencies = {
  loadJwks: () => Promise<{ keys: AuthPublicJwk[] }>;
  issuer: string;
  audience: string;
  algorithms?: readonly string[];
  now?: () => number;
  cacheTtlMs?: number;
};

/** JWT 校验器公开能力。 */
export type AuthJwtVerifier = {
  verify: (token: string) => Promise<Record<string, unknown> | null>;
};

type ImportedJwk = Awaited<ReturnType<typeof importJWK>>;
type CachedKey = {
  alg: string;
  key: ImportedJwk;
};

const DEFAULT_JWKS_TTL_MS = 60 * 60 * 1000;

/**
 * 创建按 kid 精确选钥的 JWT 校验器。
 * @param dependencies JWKS、声明约束、时钟与缓存配置。
 * @returns 只校验指定 issuer、audience、算法和未过期 token 的校验器。
 */
export const createAuthJwtVerifier = (
  dependencies: AuthJwtVerifierDependencies,
): AuthJwtVerifier => {
  const algorithms = [...(dependencies.algorithms ?? AUTH_JWT_ALGORITHMS)];
  const allowedAlgorithms = new Set(algorithms);
  const now = dependencies.now ?? Date.now;
  const cacheTtlMs = dependencies.cacheTtlMs ?? DEFAULT_JWKS_TTL_MS;
  let keysById = new Map<string, CachedKey>();
  let cachedAt = 0;
  let refreshFlight: Promise<void> | null = null;

  /**
   * 从认证提供方刷新一次 JWKS，并原子替换本地 kid 缓存。
   * @returns 当前刷新完成后的 Promise；并发调用共享同一个 Promise。
   */
  const refreshKeys = async (): Promise<void> => {
    if (refreshFlight) return refreshFlight;

    refreshFlight = (async () => {
      const result = await dependencies.loadJwks();
      const nextKeys = new Map<string, CachedKey>();
      for (const keyData of result.keys) {
        if (
          typeof keyData.kid !== "string" ||
          keyData.kid.length === 0 ||
          (keyData.alg !== undefined &&
            !allowedAlgorithms.has(keyData.alg))
        ) {
          continue;
        }

        const alg = keyData.alg ?? algorithms[0];
        if (!alg) continue;
        const key = await importJWK(keyData, alg);
        nextKeys.set(keyData.kid, { alg, key });
      }
      keysById = nextKeys;
      cachedAt = now();
    })().finally(() => {
      refreshFlight = null;
    });

    return refreshFlight;
  };

  /**
   * 确保普通读取使用的 JWKS 缓存仍在有效期内。
   * @returns 本次调用是否实际触发或等待了一次刷新。
   */
  const ensureFreshCache = async (): Promise<boolean> => {
    if (cachedAt > 0 && now() - cachedAt < cacheTtlMs) return false;
    await refreshKeys();
    return true;
  };

  /**
   * 校验单个 JWT；未知 kid 在已有缓存时最多协调强制刷新一次。
   * @param token 待验证的 JWT。
   * @returns 合法 payload；无效、过期或声明不匹配时返回 null。
   */
  const verify = async (
    token: string,
  ): Promise<Record<string, unknown> | null> => {
    let protectedHeader: ReturnType<typeof decodeProtectedHeader>;
    try {
      protectedHeader = decodeProtectedHeader(token);
    } catch {
      return null;
    }

    const { alg, kid } = protectedHeader;
    if (
      typeof kid !== "string" ||
      kid.length === 0 ||
      typeof alg !== "string" ||
      !allowedAlgorithms.has(alg)
    ) {
      return null;
    }

    const loadedDuringThisVerification = await ensureFreshCache();
    let selectedKey = keysById.get(kid);
    if (!selectedKey && !loadedDuringThisVerification) {
      await refreshKeys();
      selectedKey = keysById.get(kid);
    }
    if (!selectedKey || selectedKey.alg !== alg) return null;

    try {
      const { payload } = await jwtVerify(token, selectedKey.key, {
        issuer: dependencies.issuer,
        audience: dependencies.audience,
        algorithms,
      });
      if (typeof payload.exp !== "number") return null;
      return payload as Record<string, unknown>;
    } catch (error) {
      if (error instanceof errors.JOSEError) return null;
      throw error;
    }
  };

  return { verify };
};

let runtimeVerifierPromise: Promise<AuthJwtVerifier> | null = null;

/**
 * 延迟建立运行时校验器，避免领域模块初始化时反向依赖认证实例。
 * @returns 绑定真实 JWKS 端点与统一 authority 的校验器。
 */
const getRuntimeVerifier = async (): Promise<AuthJwtVerifier> => {
  if (!runtimeVerifierPromise) {
    runtimeVerifierPromise = import("@/lib/auth").then(
      ({ auth, authJwtAuthority }) =>
        createAuthJwtVerifier({
          loadJwks: async () => {
            const result = await auth.api.getJwks({});
            return { keys: result.keys as AuthPublicJwk[] };
          },
          issuer: authJwtAuthority,
          audience: authJwtAuthority,
          algorithms: AUTH_JWT_ALGORITHMS,
        }),
    );
  }
  return runtimeVerifierPromise;
};

/**
 * 使用应用统一 JWT 约束验证 token。
 * @param token 待校验的 Bearer JWT。
 * @returns 合法且未过期的 payload；无效凭证返回 null。
 */
export const verifyAuthJwt = async (
  token: string,
): Promise<Record<string, unknown> | null> =>
  (await getRuntimeVerifier()).verify(token);

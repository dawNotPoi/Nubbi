import type { Request, RequestHandler } from "express";

type RateBucket = {
  count: number;
  resetAt: number;
};

const WINDOW_MS = 10 * 60 * 1_000;
const MAX_REQUESTS_PER_IP = 10;
const MAX_REQUESTS_GLOBAL = 120;
const MAX_IP_BUCKETS = 5_000;
const ipBuckets = new Map<string, RateBucket>();
let globalBucket: RateBucket = { count: 0, resetAt: 0 };

const getActiveBucket = (
  bucket: RateBucket | undefined,
  now: number,
): RateBucket =>
  bucket && bucket.resetAt > now
    ? bucket
    : { count: 0, resetAt: now + WINDOW_MS };

const getRetryAfterSeconds = (
  bucket: RateBucket,
  now: number,
): number => Math.max(1, Math.ceil((bucket.resetAt - now) / 1_000));

const removeExpiredIpBuckets = (now: number): void => {
  for (const [key, bucket] of ipBuckets) {
    if (bucket.resetAt <= now) ipBuckets.delete(key);
  }

  while (ipBuckets.size >= MAX_IP_BUCKETS) {
    const oldestKey = ipBuckets.keys().next().value;
    if (typeof oldestKey !== "string") break;
    ipBuckets.delete(oldestKey);
  }
};

const getClientAddress = (req: Request): string =>
  req.ip || req.socket.remoteAddress || "unknown";

/** 限制验证码邮件的进程级总量和来源地址总量，邮箱冷却仍由业务层负责。 */
export const limitAuthCodeRequests: RequestHandler = (req, res, next): void => {
  if (req.method !== "POST") {
    next();
    return;
  }

  const now = Date.now();
  globalBucket = getActiveBucket(globalBucket, now);
  removeExpiredIpBuckets(now);
  const address = getClientAddress(req);
  const ipBucket = getActiveBucket(ipBuckets.get(address), now);
  ipBuckets.set(address, ipBucket);
  const globalBlocked = globalBucket.count >= MAX_REQUESTS_GLOBAL;
  const ipBlocked = ipBucket.count >= MAX_REQUESTS_PER_IP;

  if (!globalBlocked && !ipBlocked) {
    globalBucket.count += 1;
    ipBucket.count += 1;
    next();
    return;
  }

  const retryAfterSeconds = Math.max(
    globalBlocked ? getRetryAfterSeconds(globalBucket, now) : 0,
    ipBlocked ? getRetryAfterSeconds(ipBucket, now) : 0,
  );
  res.setHeader("Retry-After", String(retryAfterSeconds));
  res.status(429).json({
    code: 0,
    message: "验证码请求过于频繁，请稍后再试",
    data: { retryAfterSeconds },
  });
};

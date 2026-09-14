/** 会议访问尝试的计数桶 */
type AttemptBucket = {
  failures: number;
  inFlight: number;
  resetAt: number;
};

export type MeetingAccessLimit = {
  allowed: boolean;
  retryAfterSeconds: number;
};

const WINDOW_MS = 10 * 60 * 1_000;
/** 单用户单会议的最大失败次数 */
const MAX_USER_FAILURES = 5;
/** 单会议的最大失败次数（全局） */
const MAX_MEETING_FAILURES = 50;
/** 内存中最多保留的计数桶数 */
const MAX_BUCKETS = 10_000;
const userBuckets = new Map<string, AttemptBucket>();
const meetingBuckets = new Map<string, AttemptBucket>();

/** 获取指定 key 的活跃计数桶，过期则新建 */
const getActiveBucket = (
  buckets: Map<string, AttemptBucket>,
  key: string,
  now: number,
): AttemptBucket => {
  const bucket = buckets.get(key);
  if (bucket && bucket.resetAt > now) return bucket;

  const nextBucket = {
    failures: 0,
    inFlight: 0,
    resetAt: now + WINDOW_MS,
  };
  buckets.set(key, nextBucket);
  return nextBucket;
};

/** 清理过期计数桶，并限制桶总量 */
const cleanupBuckets = (
  buckets: Map<string, AttemptBucket>,
  now: number,
): void => {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  while (buckets.size >= MAX_BUCKETS) {
    const oldestKey = buckets.keys().next().value;
    if (typeof oldestKey !== "string") break;
    buckets.delete(oldestKey);
  }
};

/** 计算重试等待秒数 */
const getRetryAfterSeconds = (
  bucket: AttemptBucket,
  now: number,
): number => Math.max(1, Math.ceil((bucket.resetAt - now) / 1_000));

/** 预留一次访问尝试：超限返回禁止，否则计数并放行 */
export const reserveMeetingAccessAttempt = (
  meetingId: string,
  userId: string,
): MeetingAccessLimit => {
  const now = Date.now();
  cleanupBuckets(userBuckets, now);
  cleanupBuckets(meetingBuckets, now);
  const userBucket = getActiveBucket(
    userBuckets,
    `${meetingId}:${userId}`,
    now,
  );
  const meetingBucket = getActiveBucket(meetingBuckets, meetingId, now);
  const userBlocked =
    userBucket.failures + userBucket.inFlight >= MAX_USER_FAILURES;
  const meetingBlocked =
    meetingBucket.failures + meetingBucket.inFlight >= MAX_MEETING_FAILURES;

  const limit = {
    allowed: !userBlocked && !meetingBlocked,
    retryAfterSeconds: Math.max(
      userBlocked ? getRetryAfterSeconds(userBucket, now) : 0,
      meetingBlocked ? getRetryAfterSeconds(meetingBucket, now) : 0,
    ),
  };
  if (!limit.allowed) return limit;

  userBucket.inFlight += 1;
  meetingBucket.inFlight += 1;
  return limit;
};

/** 结算访问尝试结果：成功清空失败计数，失败累加 */
const settleBucket = (
  buckets: Map<string, AttemptBucket>,
  key: string,
  now: number,
  succeeded: boolean,
  clearFailuresOnSuccess: boolean,
): void => {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.delete(key);
    return;
  }

  bucket.inFlight = Math.max(0, bucket.inFlight - 1);
  if (succeeded) {
    if (clearFailuresOnSuccess) bucket.failures = 0;
  } else {
    bucket.failures += 1;
  }
  if (bucket.failures === 0 && bucket.inFlight === 0) buckets.delete(key);
};

/** 结算会议访问尝试（用户级和会议级双桶） */
export const settleMeetingAccessAttempt = (
  meetingId: string,
  userId: string,
  succeeded: boolean,
): void => {
  const now = Date.now();
  settleBucket(
    userBuckets,
    `${meetingId}:${userId}`,
    now,
    succeeded,
    true,
  );
  settleBucket(meetingBuckets, meetingId, now, succeeded, false);
};

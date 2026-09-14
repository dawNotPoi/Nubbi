import { httpError } from "@/common/http-error";

/** 正在关闭的会议集合 */
const closingMeetings = new Set<string>();
/** 每个会议当前活跃的写操作计数 */
const activeMutationCounts = new Map<string, number>();
/** 等待会议写操作排空的等待者集合 */
const drainWaiters = new Map<string, Set<() => void>>();

/** 通知等待该会议写操作排空的等待者继续执行 */
const notifyDrain = (meetingId: string): void => {
  const waiters = drainWaiters.get(meetingId);
  if (!waiters) return;

  drainWaiters.delete(meetingId);
  waiters.forEach((resolve) => resolve());
};

/** 获取会议写锁，关闭中的会议直接拒绝；返回释放锁的函数 */
const acquireMeetingMutation = (meetingId: string): (() => void) => {
  if (closingMeetings.has(meetingId)) {
    throw httpError(409, "会议正在关闭，不能继续修改");
  }
  activeMutationCounts.set(
    meetingId,
    (activeMutationCounts.get(meetingId) ?? 0) + 1,
  );
  let released = false;

  return () => {
    if (released) return;
    released = true;

    const nextCount = (activeMutationCounts.get(meetingId) ?? 1) - 1;
    if (nextCount > 0) {
      activeMutationCounts.set(meetingId, nextCount);
      return;
    }
    activeMutationCounts.delete(meetingId);
    notifyDrain(meetingId);
  };
};

/** 在会议写锁保护下执行操作，完成后自动释放 */
export const runMeetingMutation = async <Result>(
  meetingId: string,
  operation: () => Promise<Result>,
): Promise<Result> => {
  const release = acquireMeetingMutation(meetingId);
  try {
    return await operation();
  } finally {
    release();
  }
};

/** 开始关闭会议：登记关闭态并等待活跃写操作排空 */
export const beginMeetingClosures = async (
  meetingIds: readonly string[],
): Promise<void> => {
  const uniqueIds = Array.from(new Set(meetingIds));
  if (uniqueIds.some((meetingId) => closingMeetings.has(meetingId))) {
    throw httpError(409, "会议关闭正在处理中");
  }
  uniqueIds.forEach((meetingId) => closingMeetings.add(meetingId));

  await Promise.all(
    uniqueIds.map(async (meetingId) => {
      if ((activeMutationCounts.get(meetingId) ?? 0) === 0) return;
      await new Promise<void>((resolve) => {
        const waiters =
          drainWaiters.get(meetingId) ?? new Set<() => void>();
        waiters.add(resolve);
        drainWaiters.set(meetingId, waiters);
      });
    }),
  );
};

/** 取消会议关闭流程（操作失败时回滚） */
export const cancelMeetingClosures = (
  meetingIds: readonly string[],
): void => {
  new Set(meetingIds).forEach((meetingId) => {
    closingMeetings.delete(meetingId);
    notifyDrain(meetingId);
  });
};

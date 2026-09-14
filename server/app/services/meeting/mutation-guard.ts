import { httpError } from "@/common/http-error";

const closingMeetings = new Set<string>();
const activeMutationCounts = new Map<string, number>();
const drainWaiters = new Map<string, Set<() => void>>();

const notifyDrain = (meetingId: string): void => {
  const waiters = drainWaiters.get(meetingId);
  if (!waiters) return;

  drainWaiters.delete(meetingId);
  waiters.forEach((resolve) => resolve());
};

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

export const cancelMeetingClosures = (
  meetingIds: readonly string[],
): void => {
  new Set(meetingIds).forEach((meetingId) => {
    closingMeetings.delete(meetingId);
    notifyDrain(meetingId);
  });
};

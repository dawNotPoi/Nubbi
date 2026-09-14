import { httpError } from "@/common/http-error";
import logger from "@/common/logger";

type ReleaseMutation = () => void;
type AccountDeletionListener = (userId: string) => void;

const deletingUsers = new Set<string>();
const activeMutationCounts = new Map<string, number>();
const drainWaiters = new Map<string, Set<() => void>>();
const deletionListeners = new Set<AccountDeletionListener>();

const notifyMutationDrain = (userId: string): void => {
  const waiters = drainWaiters.get(userId);
  if (!waiters) return;

  drainWaiters.delete(userId);
  waiters.forEach((resolve) => resolve());
};

export const isAccountDeletionInProgress = (userId: string): boolean =>
  deletingUsers.has(userId);

export const subscribeAccountDeletionStart = (
  listener: AccountDeletionListener,
): (() => void) => {
  deletionListeners.add(listener);
  return () => deletionListeners.delete(listener);
};

export const acquireAccountMutation = (
  userId: string,
): ReleaseMutation => {
  if (deletingUsers.has(userId)) {
    throw httpError(409, "账号正在注销，不能继续修改数据");
  }

  activeMutationCounts.set(
    userId,
    (activeMutationCounts.get(userId) ?? 0) + 1,
  );
  let released = false;

  return () => {
    if (released) return;
    released = true;

    const nextCount = (activeMutationCounts.get(userId) ?? 1) - 1;
    if (nextCount > 0) {
      activeMutationCounts.set(userId, nextCount);
      return;
    }

    activeMutationCounts.delete(userId);
    notifyMutationDrain(userId);
  };
};

export const runAccountMutation = async <Result>(
  userId: string,
  operation: () => Promise<Result>,
): Promise<Result> => {
  const release = acquireAccountMutation(userId);
  try {
    return await operation();
  } finally {
    release();
  }
};

export const beginAccountDeletion = async (
  userId: string,
): Promise<void> => {
  if (deletingUsers.has(userId)) {
    throw httpError(409, "账号注销正在处理中");
  }
  deletingUsers.add(userId);
  deletionListeners.forEach((listener) => {
    try {
      listener(userId);
    } catch (error) {
      logger.warn("账号注销开始回调执行失败", { userId, error });
    }
  });

  if ((activeMutationCounts.get(userId) ?? 0) === 0) return;
  await new Promise<void>((resolve) => {
    const waiters = drainWaiters.get(userId) ?? new Set<() => void>();
    waiters.add(resolve);
    drainWaiters.set(userId, waiters);
  });
};

/** 注销失败时解除写入保护；注销成功后保留阻断，直到进程结束。 */
export const cancelAccountDeletion = (userId: string): void => {
  deletingUsers.delete(userId);
  notifyMutationDrain(userId);
};

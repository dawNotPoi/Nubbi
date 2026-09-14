import { httpError } from "@/common/http-error";
import logger from "@/common/logger";

/** 释放账号变更锁的函数类型 */
type ReleaseMutation = () => void;
/** 账号注销开始事件的监听器类型 */
type AccountDeletionListener = (userId: string) => void;

/** 正在注销的账号集合，注销期间阻断该账号的写操作 */
const deletingUsers = new Set<string>();
/** 每个账号当前活跃的写操作计数 */
const activeMutationCounts = new Map<string, number>();
/** 等待某账号写操作排空的 Promise 等待者集合 */
const drainWaiters = new Map<string, Set<() => void>>();
/** 账号注销开始时的监听器集合 */
const deletionListeners = new Set<AccountDeletionListener>();

/** 通知等待该账号写操作排空的等待者继续执行 */
const notifyMutationDrain = (userId: string): void => {
  const waiters = drainWaiters.get(userId);
  if (!waiters) return;

  drainWaiters.delete(userId);
  waiters.forEach((resolve) => resolve());
};

/** 查询账号是否正在注销 */
export const isAccountDeletionInProgress = (userId: string): boolean =>
  deletingUsers.has(userId);

/** 订阅账号注销开始事件，返回取消订阅函数 */
export const subscribeAccountDeletionStart = (
  listener: AccountDeletionListener,
): (() => void) => {
  deletionListeners.add(listener);
  return () => deletionListeners.delete(listener);
};

/** 获取账号变更锁，注销中的账号直接拒绝；返回释放锁的函数 */
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

/** 在账号变更锁保护下执行写操作，完成后自动释放 */
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

/** 开始注销账号：登记注销态、通知监听器，并等待活跃写操作排空 */
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

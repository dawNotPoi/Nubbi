/** 等待同组异步操作全部结束后再抛错，避免锁或注销栅栏提前释放。 */
export const waitForAll = async (
  operations: Iterable<PromiseLike<unknown>>,
  message: string,
): Promise<void> => {
  const results = await Promise.allSettled(operations);
  const errors = results.flatMap((result) =>
    result.status === "rejected" ? [result.reason] : [],
  );
  if (errors.length > 0) {
    throw new AggregateError(errors, message);
  }
};

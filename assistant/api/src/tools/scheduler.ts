/** 等待执行的任务；取消后从队列中移除，不占用并发槽。 */
type WaitingTask = { start: () => void; cancel: () => void };

/** 有界并发队列，只管理资源上限，不区分操作的读写语义。 */
export class ToolScheduler {
  private activeCount = 0;
  private readonly waiting: WaitingTask[] = [];

  /**
   * 创建并发队列。
   * @param concurrency 最大并发数量。
   */
  public constructor(private readonly concurrency: number) {}

  /**
   * 排队执行，取消后拒绝尚未启动的任务。
   * @param operation 实际工具调用。
   * @param abortSignal 本次任务的取消信号。
   * @returns 工具调用的结果。
   */
  public schedule<T>(operation: () => Promise<T>, abortSignal: AbortSignal): Promise<T> {
    abortSignal.throwIfAborted();
    return new Promise<T>((resolve, reject) => {
      const task: WaitingTask = {
        start: () => {
          abortSignal.removeEventListener("abort", task.cancel);
          this.activeCount += 1;
          void Promise.resolve()
            .then(() => {
              abortSignal.throwIfAborted();
              return operation();
            })
            .then(resolve, reject)
            .finally(() => {
              this.activeCount -= 1;
              this.drain();
            });
        },
        cancel: () => {
          const index = this.waiting.indexOf(task);
          if (index >= 0) this.waiting.splice(index, 1);
          abortSignal.removeEventListener("abort", task.cancel);
          reject(abortSignal.reason);
        },
      };
      this.waiting.push(task);
      abortSignal.addEventListener("abort", task.cancel, { once: true });
      if (abortSignal.aborted) task.cancel();
      this.drain();
    });
  }

  /** 分配空闲槽位；启动前先占槽，避免唤醒竞争导致超过并发上限。 */
  private drain(): void {
    while (this.activeCount < this.concurrency && this.waiting.length) this.waiting.shift()!.start();
  }
}

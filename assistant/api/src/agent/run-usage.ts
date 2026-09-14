import type { TokenUsage } from "@nubbi/assistant-shared/contracts";

/** 本次运行的精确用量；null 表示供应商尚未报告，零用量也是有效报告。 */
export class RunUsage {
  private total: TokenUsage | null = null;

  /**
   * 可选订阅每轮真实用量更新，未报告用量时不触发。
   * @param onUsage 用量快照订阅者。
   */
  public constructor(private readonly onUsage?: (usage: TokenUsage) => void) {}
  /**
   * 累加已完成模型轮次的用量，每轮只调用一次。
   * @param usage 模型报告的用量。
   * @returns 无返回值。
   */
  public add(usage: TokenUsage | null): void {
    if (!usage) return;
    const total = this.total ?? { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    total.promptTokens += usage.promptTokens;
    total.completionTokens += usage.completionTokens;
    total.totalTokens += usage.totalTokens;
    if (usage.promptCacheHitTokens !== undefined)
      total.promptCacheHitTokens = (total.promptCacheHitTokens ?? 0) + usage.promptCacheHitTokens;
    if (usage.promptCacheMissTokens !== undefined)
      total.promptCacheMissTokens = (total.promptCacheMissTokens ?? 0) + usage.promptCacheMissTokens;
    this.total = total;
    this.onUsage?.({ ...total });
  }
  /**
   * 读取不可变快照，避免调用者改写内部累计值。
   * @returns 当前精确用量或 null。
   */
  public snapshot(): TokenUsage | null {
    return this.total ? { ...this.total } : null;
  }
}

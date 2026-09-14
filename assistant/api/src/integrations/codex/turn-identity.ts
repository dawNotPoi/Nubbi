/** 将先到达的通知和工具请求绑定到 turn/start 实际返回的轮次。 */
export class CodexTurnIdentity {
  private resolve!: (turnId: string) => void;
  private reject!: (error: Error) => void;
  public readonly ready = new Promise<string>((resolve, reject) => {
    this.resolve = resolve;
    this.reject = reject;
  });

  /** 初始化拒绝观察器，避免启动失败时没有工具等待而产生未处理拒绝。 */
  public constructor() {
    void this.ready.catch(() => undefined);
  }

  /**
   * 确认当前轮次；等待中的工具请求随后才能校验身份。
   * @param turnId 启动响应返回的轮次 ID。
   * @returns 无返回值。
   */
  public bind(turnId: string): void {
    this.resolve(turnId);
  }

  /**
   * 启动失败或取消时拒绝尚未绑定的工具请求。
   * @returns 无返回值。
   */
  public close(): void {
    this.reject(new Error("Codex 本次运行已结束"));
  }
}

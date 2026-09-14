import type { UserAnswer } from "../contracts/index.ts";
import type { ChatApi } from "./chat-api.ts";
import type { ChatStateStore } from "./chat-state.ts";

/** 回答只提交给当前显示的问题，防止旧页面或重复点击唤醒其他 Run。 */
export class UserInputResponder {
  /** @param store 聊天状态。 @param api 回答接口。 */
  constructor(private readonly store: ChatStateStore, private readonly api: ChatApi) {}

  /**
   * 提交一次用户决定，失败保留草稿并允许重试。
   * @param requestId 界面绑定的提问 ID。
   * @param answers 结构化回答；跳过时为空。
   * @param status 回答或跳过，跳过不等于同意。
   * @returns 提交结束的 Promise。
   */
  submit = async (requestId: string, answers: UserAnswer[], status: "answered" | "dismissed"): Promise<void> => {
    const state = this.store.getSnapshot();
    if (state.answering || state.userInput?.requestId !== requestId) return;
    const request = state.userInput;
    this.store.update({ answering: true, answerError: null });
    try {
      await this.api.submitUserInput(requestId, { runId: request.runId, answers, status });
      if (this.store.getSnapshot().userInput?.requestId === requestId) this.store.update({ userInput: null });
    } catch (error) {
      if (this.store.getSnapshot().userInput?.requestId === requestId)
        this.store.update({ answerError: error instanceof Error ? error.message : "回答提交失败" });
    } finally {
      // 旧回答的 HTTP 回调不能清除新问题的提交状态。
      const current = this.store.getSnapshot().userInput;
      if (!current || current.requestId === requestId) this.store.update({ answering: false });
    }
  };
}

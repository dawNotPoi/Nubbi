import { randomUUID } from "node:crypto";
import type { AgentEvent, UserInputPart, UserInputSubmission, UserQuestion } from "@nubbi/assistant-shared/contracts";

type PendingQuestion = {
  request: UserInputPart;
  settle: (status: "answered" | "dismissed" | "cancelled", answers: UserInputPart["answers"]) => void;
};

/** 仅当前进程有效的用户等待；不恢复重启前的 Run。 */
export class UserInputService {
  private readonly pending = new Map<string, PendingQuestion>();

  /**
   * 发出问题并等待用户，取消释放等待且不伪造用户回答。
   * @param input Run、问题、取消信号和事件订阅者。
   * @returns 本次问答记录。
   */
  request(input: { runId: string; questions: UserQuestion[]; signal: AbortSignal; emit: (event: AgentEvent) => void }): Promise<UserInputPart> {
    input.signal.throwIfAborted();
    if (this.hasPending(input.runId)) throw new Error("当前 Run 已在等待用户回答，请勿重复提问");
    const request: UserInputPart = {
      type: "user-input", requestId: randomUUID(), runId: input.runId,
      questions: input.questions, status: "pending", answers: [],
    };
    return new Promise((resolve, reject) => {
      const cancel = (): void => settle("cancelled", []);
      const settle: PendingQuestion["settle"] = (status, answers) => {
        if (!this.pending.delete(request.requestId)) return;
        input.signal.removeEventListener("abort", cancel);
        input.emit({ type: "user-input-resolved", requestId: request.requestId, status, answers });
        if (status === "cancelled") reject(input.signal.reason ?? new Error("任务已结束"));
        else resolve({ ...request, status, answers });
      };
      this.pending.set(request.requestId, { request, settle });
      input.signal.addEventListener("abort", cancel, { once: true });
      input.emit({ type: "user-input-request", requestId: request.requestId, runId: input.runId, questions: input.questions });
      if (input.signal.aborted) cancel();
    });
  }

  /**
   * 校验并接收一次回答；重复回答、旧 Run 回答均不能唤醒任务。
   * @param requestId 待回答的请求。
   * @param submission 已通过 HTTP 形状校验的回答。
   * @returns 找不到返回 missing，内容不匹配返回 invalid，成功返回 resolved。
   */
  submit(requestId: string, submission: UserInputSubmission): "missing" | "invalid" | "resolved" {
    const item = this.pending.get(requestId);
    if (!item || item.request.runId !== submission.runId) return "missing";
    const { questions } = item.request;
    const { answers } = submission;
    if (submission.status === "dismissed") {
      if (answers.length) return "invalid";
    } else {
      if (answers.length !== questions.length || new Set(answers.map((answer) => answer.questionId)).size !== questions.length)
        return "invalid";
      for (const answer of answers) {
        const question = questions.find((candidate) => candidate.id === answer.questionId);
        if (!question) return "invalid";
        if (answer.kind === "option" ? !question.options.some((option) => option.id === answer.optionId)
          : !question.allowCustomAnswer || !answer.text.trim()) return "invalid";
      }
    }
    item.settle(submission.status, answers);
    return "resolved";
  }

  /** @param runId 当前运行。 @returns 是否正在等待用户。 */
  hasPending(runId: string): boolean {
    return [...this.pending.values()].some((item) => item.request.runId === runId);
  }

  /** @param runId 待结束的运行。 @returns 无返回值。 */
  cancelRun(runId: string): void {
    for (const item of this.pending.values()) if (item.request.runId === runId) item.settle("cancelled", []);
  }
}
/** HTTP 与执行器共享的进程内交互服务。 */
export const userInputService = new UserInputService();

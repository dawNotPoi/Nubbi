import type { MessagePart } from "./messages.ts";
import type { StreamEvent } from "./events.ts";
import type { UserInputPart } from "./user-input.ts";

/**
 * 将问答事件归并为一份历史记录，回答不再单独生成重复卡片。
 * @param parts 当前内容块。
 * @param event 运行事件。
 * @returns 问答事件对应的新数组，其他事件返回原数组。
 */
export function applyUserInputEvent<T extends MessagePart>(parts: T[], event: StreamEvent): (T | UserInputPart)[] {
  if (event.type === "user-input-request") {
    if (parts.some((part) => part.type === "user-input" && part.requestId === event.requestId)) return parts;
    return [...parts, { type: "user-input", requestId: event.requestId, runId: event.runId,
      questions: event.questions, status: "pending", answers: [] }];
  }
  if (event.type === "user-input-resolved") return parts.map((part) =>
    part.type === "user-input" && part.requestId === event.requestId
      ? { ...part, status: event.status, answers: event.answers } : part);
  return parts;
}

/**
 * 将结构化问答转换为只读文本，模型历史与两端消息展示共用。
 * @param part 一次问答记录。
 * @returns 问题和用户答案，未回答不得描述为同意。
 */
export function formatUserInput(part: UserInputPart): string {
  return part.questions.map((question) => {
    const answer = part.answers.find((item) => item.questionId === question.id);
    const text = answer?.kind === "text" ? answer.text : answer?.kind === "option"
      ? question.options.find((option) => option.id === answer.optionId)?.label : undefined;
    return `${question.title}\n用户回答：${text ?? (part.status === "dismissed" ? "已跳过（未授权）" : part.status === "cancelled" ? "已取消" : "未回答")}`;
  }).join("\n\n");
}

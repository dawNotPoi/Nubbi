/** 模型提出的问题；选项 ID 用于稳定匹配，界面额外提供自定义回答入口。 */
export type UserQuestion = {
  id: string;
  title: string;
  options: { id: string; label: string; description?: string }[];
  allowCustomAnswer: boolean;
};
/** 用户选择选项或填写自定义内容，不能把展示文案当成选项身份。 */
export type UserAnswer =
  | { questionId: string; kind: "option"; optionId: string }
  | { questionId: string; kind: "text"; text: string };
/** 当前 Run 中等待回答的一次提问。 */
export type UserInputRequest = { requestId: string; runId: string; questions: UserQuestion[] };
/** 提交必须绑定 Run；跳过不表示对任何行动授权。 */
export type UserInputSubmission = {
  runId: string;
  status: "answered" | "dismissed";
  answers: UserAnswer[];
};
/** 问答历史与流式消息共用的内容块，历史内容不可再次提交。 */
export type UserInputPart = UserInputRequest & {
  type: "user-input";
  status: "pending" | "answered" | "dismissed" | "cancelled";
  answers: UserAnswer[];
};
/** 提问由 Agent 调用，不属于普通工具队列。 */
export const ASK_USER_TOOL_NAME = "ask_user";

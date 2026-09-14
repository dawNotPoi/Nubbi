import { z } from "zod";
const identifierSchema = z.string().trim().min(1).max(100);
const questionSchema = z.object({
  id: identifierSchema,
  title: z.string().trim().min(1).max(2000),
  options: z.array(z.object({
    id: identifierSchema, label: z.string().trim().min(1).max(200),
    description: z.string().max(1000).optional(),
  })).max(6).default([]),
  allowCustomAnswer: z.boolean().default(true),
}).superRefine((question, context) => {
  if (new Set(question.options.map((option) => option.id)).size !== question.options.length)
    context.addIssue({ code: "custom", message: "选项 ID 不能重复" });
  if (!question.allowCustomAnswer && !question.options.length)
    context.addIssue({ code: "custom", message: "问题至少提供选项或自定义输入" });
});
/** 模型提问参数校验，拒绝重复 ID 和无法回答的问题。 */
export const askUserSchema = z.object({ questions: z.array(questionSchema).min(1).max(3) }).superRefine((input, context) => {
  if (new Set(input.questions.map((question) => question.id)).size !== input.questions.length)
    context.addIssue({ code: "custom", message: "问题 ID 不能重复" });
});
/** HTTP 回答类型由校验规则推导；具体选项匹配在交互服务中完成。 */
export const userInputSubmissionSchema = z.object({
  runId: z.string().min(1).max(100),
  status: z.enum(["answered", "dismissed"]),
  answers: z.array(z.discriminatedUnion("kind", [
    z.object({ questionId: identifierSchema, kind: z.literal("option"), optionId: identifierSchema }),
    z.object({ questionId: identifierSchema, kind: z.literal("text"), text: z.string().trim().min(1).max(10000) }),
  ])).max(3),
});
/** 用户提交的结构化请求。 */
export type UserInputBody = z.infer<typeof userInputSubmissionSchema>;

import { z } from "zod";

/** 消息入口契约：模型由本次请求明确指定，不回退到全局默认模型。 */
export const sendMessageSchema = z.object({
  content: z.string().trim().min(1).max(20_000).refine(
    (value) => !value.includes("\uFFFD"),
    "消息内容包含无法识别的字符，请检查输入编码",
  ),
  model: z.string({ required_error: "请选择本次使用的模型" }).trim().min(1, "请选择本次使用的模型").max(200),
});

/** 从校验规则推导请求类型，避免 HTTP 入参声明与校验规则各自维护。 */
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

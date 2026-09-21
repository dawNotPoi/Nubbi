import { validateEmailAddress } from "@/lib/emailAddress";
import { z } from "zod/v3";

const emailSchema = z
  .string({ required_error: "邮箱不能为空" })
  .trim()
  .min(1, "邮箱不能为空")
  .transform((value) => value.toLowerCase())
  .superRefine((value, context) => {
    const message = validateEmailAddress(value);
    if (message) {
      context.addIssue({ code: z.ZodIssueCode.custom, message });
    }
  });

const verificationCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "请输入 6 位数字验证码");

export const emailBodySchema = z.object({
  email: emailSchema,
}).strict();

export const registerEmailBodySchema = z.object({
  username: z
    .string({ required_error: "请输入用户名" })
    .trim()
    .min(3, "用户名至少 3 位")
    .max(20, "用户名最多 20 位")
    .regex(/^[a-zA-Z0-9_]+$/, "用户名只能包含字母、数字和下划线"),
  email: emailSchema,
  password: z.string().min(8, "密码至少 8 位"),
  code: verificationCodeSchema,
}).strict();

export const verificationCodeBodySchema = z.object({
  email: emailSchema,
  code: verificationCodeSchema,
}).strict();

export const accountDeletionBodySchema = z.object({
  code: verificationCodeSchema,
  confirmed: z
    .boolean({ required_error: "请先确认注销账号操作" })
    .refine(Boolean, "请先确认注销账号操作"),
}).strict();

export const passwordResetBodySchema = z.object({
  email: emailSchema,
  code: verificationCodeSchema,
  newPassword: z.string().min(8, "新密码至少需要 8 位"),
}).strict();

export const mcpApiKeyBodySchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    expiresIn: z
      .number()
      .int()
      .min(60 * 60 * 24)
      .max(60 * 60 * 24 * 365)
      .optional(),
  })
  .strict();

export const avatarBodySchema = z.object({
  imageUrl: z
    .string()
    .trim()
    .regex(/^(https?:\/\/|data:image\/)/, "请提供有效的图片地址"),
}).strict();

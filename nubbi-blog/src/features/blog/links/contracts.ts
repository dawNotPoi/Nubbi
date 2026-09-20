import { z } from "zod";

/** 预览只传递纯文本，不接收外站 HTML、脚本或任意样式。 */
export const linkPreviewSchema = z.object({
  title: z.string().max(180),
  description: z.string().max(300),
  siteName: z.string().max(80),
  available: z.boolean(),
});

/** 经接口校验后的链接摘要。 */
export type LinkPreview = z.infer<typeof linkPreviewSchema>;

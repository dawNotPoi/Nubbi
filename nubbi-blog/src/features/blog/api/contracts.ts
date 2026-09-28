import { z } from "zod";

/** 博客适配后的展示白名单；账号笔记的内部字段不会进入渲染层。 */
export const postSummarySchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i),
  title: z.string(),
  excerpt: z.string(),
  tags: z.array(z.string()),
  cover: z.string(),
  author: z.string().nullable(),
  date: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

/** 文章详情额外携带当前 Note Markdown 正文。 */
export const postSchema = postSummarySchema.extend({ content: z.string() });

/** 博客在现有笔记列表返回范围内生成的分页结构。 */
export const postPageSchema = z.object({
  items: z.array(postSummarySchema),
  total: z.number().int().nonnegative(),
  count: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
  hasMore: z.boolean(),
  nextOffset: z.number().int().nonnegative().nullable(),
});

/** 列表展示模型。 */
export type PostSummary = z.infer<typeof postSummarySchema>;
/** 正文阅读模型。 */
export type Post = z.infer<typeof postSchema>;
/** 标准文章分页。 */
export type PostPage = z.infer<typeof postPageSchema>;

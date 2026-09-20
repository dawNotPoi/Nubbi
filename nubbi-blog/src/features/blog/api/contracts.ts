import { z } from "zod";

/** 公开接口的白名单字段；模型内部字段不会进入渲染层。 */
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

/** 与 Nubbi 标准分页响应一致的运行时校验。 */
export const postPageSchema = z.object({
  items: z.array(postSummarySchema),
  total: z.number().int().nonnegative(),
  count: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
  hasMore: z.boolean(),
  nextOffset: z.number().int().nonnegative().nullable(),
});

/** 标签聚合响应，不使用私有 /tag 接口。 */
export const tagsSchema = z.array(
  z.object({ name: z.string(), count: z.number().int().positive() }),
);

/** 列表展示模型。 */
export type PostSummary = z.infer<typeof postSummarySchema>;
/** 正文阅读模型。 */
export type Post = z.infer<typeof postSchema>;
/** 标准文章分页。 */
export type PostPage = z.infer<typeof postPageSchema>;
/** 标签及可阅读文章数。 */
export type BlogTag = z.infer<typeof tagsSchema>[number];

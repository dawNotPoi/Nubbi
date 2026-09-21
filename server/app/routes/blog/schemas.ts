import { paginationQuerySchema } from "@/common/pagination";
import { z } from "zod/v3";

/** 博客列表只接受有界的分页和字面搜索，避免访客传入任意数据库条件。 */
export const blogListQuerySchema = paginationQuerySchema.extend({
  limit: z.coerce.number().int().min(1).max(50).default(12),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
  q: z.string().trim().max(100).default(""),
  tag: z.string().trim().max(50).default(""),
  order: z.enum(["newest", "oldest", "updated"]).default("newest"),
});

/** 使用稳定的 Note ID，不接受未经唯一性约束的 slug。 */
export const blogPostParamsSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, "文章 ID 格式无效"),
});

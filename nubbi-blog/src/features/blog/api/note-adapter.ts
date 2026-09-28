import "server-only";
import { z } from "zod";
import { postPageSchema, type PostSummary } from "./contracts";
import { summarizeMarkdown } from "../markdown/content";

/** 现有笔记接口的读取契约；不接收未声明的账号和内部字段。 */
export const noteSummarySchema = z.object({
  _id: z.string().regex(/^[a-f\d]{24}$/i),
  title: z.string(),
  published: z.boolean(),
  password: z.string().nullish(),
  deletedAt: z.iso.datetime().nullable(),
  tags: z.array(z.string()),
  cover: z.string(),
  author: z.string().nullable(),
  date: z.iso.datetime().nullish(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime().nullish(),
  meta: z.array(z.object({ key: z.string(), value: z.unknown() })).optional(),
});

/** 正文接口可能返回 null，存在的笔记必须包含完整 Markdown。 */
export const noteDetailSchema = noteSummarySchema.extend({ content: z.string() });

/** 仅在服务端适配过程中使用，不传给页面或客户端组件。 */
type NoteSummary = z.infer<typeof noteSummarySchema>;

/**
 * 账号可读取不等于可以公开，所有展示入口均检查当前发布状态。
 * @param note 当前请求返回的笔记。
 * @returns 是否为无密码、未删除的已发布文章。
 */
export function isPublicNote(note: NoteSummary): boolean {
  return note.published === true && note.deletedAt === null && !note.password;
}

/**
 * 显式构造展示字段，防止账号数据或任意 meta 被序列化到页面。
 * @param note 已通过公开检查的笔记。
 * @param content 详情正文；列表没有正文时不生成摘要。
 * @returns 不含权限字段的文章摘要。
 */
export function presentNote(note: NoteSummary, content = ""): PostSummary {
  const excerpt = note.meta?.find((entry) => entry.key === "excerpt")?.value;
  return {
    id: note._id,
    title: note.title || "未命名文章",
    excerpt: (typeof excerpt === "string" ? excerpt.trim().slice(0, 240) : "") || summarizeMarkdown(content),
    tags: [...new Set(note.tags)].filter(Boolean),
    cover: note.cover,
    author: note.author,
    date: note.date || note.createdAt,
    updatedAt: note.updatedAt || note.createdAt,
  };
}

/** 现有笔记列表的标准分页契约，原始记录仅在服务端使用。 */
export const notePageSchema = postPageSchema.extend({ items: z.array(noteSummarySchema) });

import type { NoteEntity } from "@/models/note";
import type { Types } from "mongoose";
import type { BlogPostSummary } from "./types";

/** 只包含展示需要的数据库字段，meta 的内容始终按 unknown 处理。 */
export type BlogRecord = Pick<
  NoteEntity,
  | "title"
  | "content"
  | "tags"
  | "cover"
  | "author"
  | "date"
  | "createdAt"
  | "updatedAt"
> & { _id: Types.ObjectId; meta?: unknown };

/**
 * 只提取显式声明的摘要，阻止任意 meta 进入公开响应。
 * @param meta 笔记保存的元数据。
 * @returns 用户填写的公开摘要，没有时返回空串。
 */
function readExcerpt(meta: unknown): string {
  if (!Array.isArray(meta)) return "";
  const entry: unknown = meta.find(
    (value: unknown) =>
      typeof value === "object" &&
      value !== null &&
      "key" in value &&
      value.key === "excerpt",
  );
  return typeof entry === "object" &&
    entry !== null &&
    "value" in entry &&
    typeof entry.value === "string"
    ? entry.value.trim().slice(0, 240)
    : "";
}

/**
 * 将短 Markdown 片段转为列表纯文本，避免传输整篇正文。
 * @param content 已截断的正文片段。
 * @returns 最多 180 字的可读摘要。
 */
function summarize(content: string): string {
  return content
    .replace(/```[\s\S]*?(?:```|$)/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/[#*_>`~|]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

/**
 * 明确构造白名单，防止模型新增字段后自动泄漏到公开接口。
 * @param item 已经过公开过滤的数据库记录。
 * @returns 稳定、无内部字段的文章摘要。
 */
export function presentBlogSummary(item: BlogRecord): BlogPostSummary {
  return {
    id: String(item._id),
    title: item.title || "未命名文章",
    excerpt:
      readExcerpt(item.meta) || summarize((item.content || "").slice(0, 800)),
    tags: [...new Set(item.tags)].filter(Boolean),
    cover: item.cover || "",
    author: item.author || null,
    date: (item.date || item.createdAt).toISOString(),
    updatedAt: (item.updatedAt || item.createdAt).toISOString(),
  };
}

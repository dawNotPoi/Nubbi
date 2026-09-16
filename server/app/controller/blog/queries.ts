import { httpError } from "@/common/http-error";
import {
  buildPaginationResult,
  type PaginationResult,
} from "@/common/pagination";
import env from "@/lib/env";
import Note, { type NoteEntity } from "@/models/note";
import type { FilterQuery } from "mongoose";
import { presentBlogSummary } from "./presentation";
import type {
  BlogListInput,
  BlogPost,
  BlogPostSummary,
  BlogTag,
} from "./types";

const queryTimeout = 5_000;
const displayFields =
  "title content tags cover author date createdAt updatedAt meta";

// 列表在数据库侧截断正文并只取摘要元数据，避免每页搬运多篇完整长文。
const summaryFields = {
  title: 1,
  tags: 1,
  cover: 1,
  author: 1,
  date: 1,
  createdAt: 1,
  updatedAt: 1,
  content: { $substrCP: [{ $ifNull: ["$content", ""] }, 0, 800] },
  meta: {
    $filter: {
      input: { $cond: [{ $isArray: "$meta" }, "$meta", []] },
      as: "entry",
      cond: { $eq: ["$$entry.key", "excerpt"] },
    },
  },
};

/**
 * 所有公开查询共享同一边界，列表和详情均不可绕过密码与回收站限制。
 * @returns 公开笔记的固定过滤条件。
 */
function publicFilter(): FilterQuery<NoteEntity> {
  return {
    published: true,
    deletedAt: null,
    password: { $in: [null, ""] },
    ...(env.BLOG_AUTHOR_ID ? { userId: env.BLOG_AUTHOR_ID } : {}),
  };
}

/**
 * 按标题、标签字面搜索公开文章并返回稳定分页。
 * @param input 已校验的分页和筛选条件。
 * @returns 不包含正文或内部字段的文章分页。
 */
export async function listBlogPosts(
  input: BlogListInput,
): Promise<PaginationResult<BlogPostSummary>> {
  const filter = publicFilter();
  if (input.tag) filter.tags = input.tag;
  if (input.q) {
    const search = new RegExp(
      input.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
    filter.$or = [{ title: search }, { tags: search }];
  }
  const [records, total] = await Promise.all([
    Note.find(filter)
      .select(summaryFields)
      .sort(input.order === "updated"
        ? { updatedAt: -1, _id: -1 }
        : { createdAt: input.order === "oldest" ? 1 : -1, _id: input.order === "oldest" ? 1 : -1 })
      .skip(input.offset)
      .limit(input.limit)
      .maxTimeMS(queryTimeout)
      .lean(),
    Note.countDocuments(filter).maxTimeMS(queryTimeout),
  ]);
  return buildPaginationResult(records.map(presentBlogSummary), total, input);
}

/**
 * 使用与列表一致的条件读取正文，撤回发布后即不可继续读取。
 * @param id 已校验的文章 ObjectId。
 * @returns 可公开的文章正文与摘要。
 */
export async function getBlogPost(id: string): Promise<BlogPost> {
  const record = await Note.findOne({ ...publicFilter(), _id: id })
    .select(displayFields)
    .maxTimeMS(queryTimeout)
    .lean();
  if (!record) throw httpError(404, "文章不存在或尚未公开");
  return { ...presentBlogSummary(record), content: record.content || "" };
}

/**
 * 标签只统计可公开的文章，不暴露草稿使用的标签。
 * @returns 按文章数排序的前 100 个公开标签。
 */
export async function listBlogTags(): Promise<BlogTag[]> {
  return Note.aggregate<BlogTag>([
    { $match: publicFilter() },
    { $project: { tags: { $setUnion: ["$tags", []] } } },
    { $unwind: "$tags" },
    { $match: { tags: { $type: "string", $ne: "" } } },
    { $group: { _id: "$tags", count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    { $limit: 100 },
    { $project: { _id: 0, name: "$_id", count: 1 } },
  ]).option({ maxTimeMS: queryTimeout });
}

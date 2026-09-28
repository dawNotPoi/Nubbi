import { buildPaginationResult, type PaginationInput, type PaginationResult } from "@/common/pagination";
import note from "@/models/note";
import tag from "@/models/tag";

const normalizeTagName = (name: unknown) =>
  typeof name === "string" ? name.trim() : "";

/** @param userId 账号。@param pagination 分页参数。@returns 标签目录分页，旧数据在数据库聚合去重。 */
export const listTags = async (
  userId: string,
  pagination: PaginationInput,
): Promise<PaginationResult<string>> => {
  const total = await tag.countDocuments({ userId });
  if (total > 0) {
    const tags = await tag.find({ userId }).sort({ name: 1, _id: 1 })
      .skip(pagination.offset).limit(pagination.limit).select("name").lean();
    return buildPaginationResult(tags.map((item) => item.name), total, pagination);
  }
  const [result] = await note.aggregate<{ items: { name: string }[]; totals: { count: number }[] }>([
    { $match: { userId, deletedAt: null } },
    { $unwind: "$tags" },
    { $match: { tags: { $type: "string" } } },
    { $project: { name: { $trim: { input: "$tags" } } } },
    { $match: { name: { $ne: "" } } },
    { $group: { _id: "$name" } },
    { $sort: { _id: 1 } },
    { $facet: {
      items: [{ $skip: pagination.offset }, { $limit: pagination.limit }, { $project: { _id: 0, name: "$_id" } }],
      totals: [{ $count: "count" }],
    } },
  ]);
  return buildPaginationResult(result?.items.map((item) => item.name) ?? [], result?.totals[0]?.count ?? 0, pagination);
};

export const createTag = async (
  userId: string,
  name: string,
): Promise<string | null> => {
  const cleanName = normalizeTagName(name);
  if (!cleanName) return null;

  await tag.findOneAndUpdate(
    { userId, name: cleanName },
    { $setOnInsert: { userId, name: cleanName } },
    { upsert: true },
  );

  return cleanName;
};

export const deleteTag = async (
  userId: string,
  name: string,
): Promise<boolean> => {
  const cleanName = normalizeTagName(name);
  if (!cleanName) return false;

  await tag.deleteOne({ userId, name: cleanName });
  await note.updateMany(
    { userId, tags: cleanName },
    { $pull: { tags: cleanName } },
  );

  return true;
};

/**
 * 将标签名称记录到用户的标签库中。
 *
 * 写入前会去除首尾空格、忽略空标签并合并重复项，然后通过 upsert 幂等写入。
 * 此操作不会修改 Note 文档，也不会删除已不再被任何笔记使用的标签记录。
 */
export const recordUserTags = async (
  userId: string,
  tagNames?: readonly string[] | null,
): Promise<void> => {
  if (!tagNames?.length) return;

  const uniqueNames = Array.from(
    new Set(tagNames.map(normalizeTagName).filter(Boolean)),
  );

  if (!uniqueNames.length) return;

  await tag.bulkWrite(
    uniqueNames.map((name) => ({
      updateOne: {
        filter: { userId, name },
        update: { $setOnInsert: { userId, name } },
        upsert: true,
      },
    })),
  );
};

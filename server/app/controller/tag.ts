import note from "@/models/note";
import tag from "@/models/tag";

const normalizeTagName = (name: unknown) =>
  typeof name === "string" ? name.trim() : "";

const readLegacyNoteTags = async (userId: string): Promise<string[]> => {
  const notes = await note.find({ userId, deletedAt: null }, "tags").lean();
  const uniqueNames = new Set<string>();

  notes.forEach((noteItem) => {
    (noteItem.tags || []).forEach((name: string) => {
      const cleanName = normalizeTagName(name);
      if (cleanName) uniqueNames.add(cleanName);
    });
  });

  return Array.from(uniqueNames).sort((left, right) =>
    left.localeCompare(right),
  );
};

export const listTags = async (userId: string): Promise<string[]> => {
  const tags = await tag.find({ userId }).sort({ name: 1 }).lean();
  return tags.length > 0
    ? tags.map((item) => item.name)
    : readLegacyNoteTags(userId);
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

import note from "@/models/note";
import tag from "@/models/tag";

const normalizeTagName = (name: unknown) =>
  typeof name === "string" ? name.trim() : "";

const seedTagsFromNotes = async (userId: string) => {
  const notes = await note.find({ userId, deletedAt: null }, "tags").lean();
  const uniqueNames = new Set<string>();

  notes.forEach((noteItem) => {
    (noteItem.tags || []).forEach((name: string) => {
      const cleanName = normalizeTagName(name);
      if (cleanName) uniqueNames.add(cleanName);
    });
  });

  if (!uniqueNames.size) return;

  await tag.insertMany(
    Array.from(uniqueNames).map((name) => ({ userId, name })),
    { ordered: false },
  ).catch(() => null);
};

export const listTags = async (userId: string) => {
  let tags = await tag.find({ userId }).sort({ name: 1 }).lean();

  if (!tags.length) {
    await seedTagsFromNotes(userId);
    tags = await tag.find({ userId }).sort({ name: 1 }).lean();
  }

  return tags.map((item) => item.name);
};

export const createTag = async (userId: string, name: string) => {
  const cleanName = normalizeTagName(name);
  if (!cleanName) return null;

  await tag.findOneAndUpdate(
    { userId, name: cleanName },
    { $setOnInsert: { userId, name: cleanName } },
    { upsert: true },
  );

  return cleanName;
};

export const deleteTag = async (userId: string, name: string) => {
  const cleanName = normalizeTagName(name);
  if (!cleanName) return false;

  await tag.deleteOne({ userId, name: cleanName });
  await note.updateMany(
    { userId, tags: cleanName },
    { $pull: { tags: cleanName } },
  );

  return true;
};

export const syncUserTags = async (userId: string, names: unknown) => {
  if (!Array.isArray(names) || !names.length) return;

  const uniqueNames = Array.from(
    new Set(names.map(normalizeTagName).filter(Boolean)),
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

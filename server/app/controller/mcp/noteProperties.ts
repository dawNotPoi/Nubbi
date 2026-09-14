import Note from "@/models/note";
import { assertAgentNote } from "@/controller/note/access";
import { recordUserTags } from "@/controller/tag";
import { assertExpectedDate, httpError, serializeNote } from "./shared";
import type { McpNoteResult } from "./types";

type MetaEntry = { key: string; value: unknown; type: string };

export type PropertiesPatchInput = {
  expectedUpdatedAt: string;
  title?: string;
  author?: string | null;
  date?: Date;
  tagsAdd?: string[];
  tagsRemove?: string[];
  metaSet?: Record<string, unknown>;
  metaRemove?: string[];
};

const normalizeTags = (items: string[]): string[] =>
  [...new Set(items.map((tag) => tag.trim()).filter(Boolean))];

const normalizeMeta = (value: unknown): MetaEntry[] =>
  Array.isArray(value)
    ? value
        .filter(
          (entry): entry is Record<string, unknown> =>
            Boolean(entry) && typeof entry === "object" && "key" in entry,
        )
        .map((entry) => ({
          key: String(entry.key),
          value: entry.value,
          type: typeof entry.type === "string" ? entry.type : "text",
        }))
    : [];

const patchMeta = (
  current: MetaEntry[],
  set: Record<string, unknown> = {},
  remove: string[] = [],
): MetaEntry[] => {
  const removed = new Set(remove);
  const entries = new Map(
    current.filter((item) => !removed.has(item.key)).map((item) => [item.key, item]),
  );
  Object.entries(set).forEach(([key, value]) => {
    const previous = entries.get(key);
    entries.set(key, {
      key,
      value,
      type: previous?.type ?? (typeof value === "number" ? "number" : "text"),
    });
  });
  return [...entries.values()];
};

export const updateMcpNoteProperties = async (
  userId: string,
  noteId: string,
  input: PropertiesPatchInput,
): Promise<McpNoteResult> => {
  const access = await assertAgentNote(userId, noteId);
  assertExpectedDate(input.expectedUpdatedAt, access.updatedAt);

  const item = await Note.findOne({ _id: noteId, userId, deletedAt: null })
    .select("tags meta updatedAt")
    .lean();
  if (!item) throw httpError(404, "Note not found");

  const currentTags = Array.isArray(item.tags) ? item.tags : [];
  const removedTags = new Set(input.tagsRemove ?? []);
  const tags = normalizeTags([
    ...currentTags.filter((tag) => !removedTags.has(tag)),
    ...(input.tagsAdd ?? []),
  ]);
  const meta = patchMeta(
    normalizeMeta(item.meta),
    input.metaSet,
    input.metaRemove,
  );
  const fields: Record<string, unknown> = { tags, meta };
  if (input.title !== undefined) fields.title = input.title;
  if (input.author !== undefined) fields.author = input.author;
  if (input.date !== undefined) fields.date = input.date;

  const updated = await Note.findOneAndUpdate(
    {
      _id: noteId,
      userId,
      source: "agent",
      deletedAt: null,
      updatedAt: access.updatedAt,
    },
    { $set: fields },
    { new: true },
  );
  if (!updated) {
    const current = await Note.findOne({ _id: noteId, userId })
      .select("updatedAt")
      .lean();
    throw httpError(409, "Note was changed; read it again and retry", {
      updatedAt: current?.updatedAt?.toISOString() ?? null,
    });
  }

  await recordUserTags(userId, tags);
  return serializeNote(updated);
};

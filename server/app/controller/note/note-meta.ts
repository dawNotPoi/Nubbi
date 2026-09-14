import type { NoteEntity } from "@/models/note";

type NoteMetaSubdocument = NonNullable<NoteEntity["meta"]>[number];

export type MetaEntry = Pick<
  NoteMetaSubdocument,
  "key" | "value" | "type"
>;

export const normalizeMetaEntries = (meta: unknown): MetaEntry[] => {
  if (!meta) return [];

  if (Array.isArray(meta)) {
    return meta
      .filter((entry) => entry && typeof entry === "object" && "key" in entry)
      .map((entry) => {
        const value = entry as Partial<MetaEntry>;
        return {
          key: String(value.key),
          value: value.value,
          type: value.type || "text",
        };
      });
  }

  if (typeof meta === "object") {
    return Object.entries(meta as Record<string, unknown>)
      .filter(([key]) => key !== "summary")
      .map(([key, value]) => ({
        key,
        value,
        type: typeof value === "number" ? "number" : "text",
      }));
  }

  return [];
};

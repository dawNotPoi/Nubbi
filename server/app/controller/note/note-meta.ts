import type { NoteEntity } from "@/models/note";

/** 笔记 meta 子文档结构 */
type NoteMetaSubdocument = NonNullable<NoteEntity["meta"]>[number];

/** meta 条目类型 */
export type MetaEntry = Pick<
  NoteMetaSubdocument,
  "key" | "value" | "type"
>;

/** 将外部传入的 meta 标准化为条目数组（数组或对象两种形态） */
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

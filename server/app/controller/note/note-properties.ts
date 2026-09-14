import type { NoteEntity } from "@/models/note";
import { normalizeMetaEntries } from "./note-meta";

type MutableNoteProperties = Pick<
  NoteEntity,
  | "title"
  | "author"
  | "source"
  | "status"
  | "published"
  | "tags"
  | "cover"
  | "password"
  | "date"
  | "expiresAt"
>;

export type NotePropertiesInput = Partial<MutableNoteProperties> & {
  parentId?: string | null;
  meta?: unknown;
};

export type NormalizedNoteProperties = Omit<NotePropertiesInput, "meta"> & {
  meta?: ReturnType<typeof normalizeMetaEntries>;
};

/** 将外部属性输入转换成 Note 模型可以直接更新的结构。 */
export const normalizeNoteProperties = (
  properties: NotePropertiesInput,
): NormalizedNoteProperties => {
  const { meta, ...nextProperties } = properties;

  return Object.prototype.hasOwnProperty.call(properties, "meta")
    ? { ...nextProperties, meta: normalizeMetaEntries(meta) }
    : nextProperties;
};

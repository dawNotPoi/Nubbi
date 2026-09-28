import { httpError } from "@/common/http-error";
import type { NoteDocument } from "@/models/note";
import { recordUserTags } from "../tag";
import { assertOwnedNote } from "./access";
import { createNote, type CreateNoteInput } from "./create";
import {
  validateNoteMoveTarget,
} from "./hierarchy-query";
import type { NotePaginationResult } from "./query-types";
import type { NoteListQuery } from "@/routes/note/schemas";
import { queryNotePage } from "./list-query";
import {
  updateNoteMeta,
  type NotePropertiesInput,
} from "./update";

/** 创建用户笔记的命令参数 */
export type CreateUserNoteCommand = {
  userId: string;
  input: Omit<CreateNoteInput, "userId" | "status">;
};

/** 创建用户笔记，并把本次使用的标签记录到用户标签集合。 */
export const createUserNote = async ({
  userId,
  input,
}: CreateUserNoteCommand): Promise<NoteDocument> => {
  const createdNote = await createNote({ ...input, userId });
  await recordUserTags(userId, input.tags);
  return createdNote;
};

/** 更新用户笔记属性的命令参数 */
export type UpdateUserNotePropertiesCommand = {
  userId: string;
  noteId: string;
  properties: NotePropertiesInput;
};

/** 更新用户笔记属性，并统一处理结构变更校验和用户标签记录。 */
export const updateUserNoteProperties = async ({
  userId,
  noteId,
  properties,
}: UpdateUserNotePropertiesCommand): Promise<NoteDocument> => {
  const hasParentChange = Object.prototype.hasOwnProperty.call(
    properties,
    "parentId",
  );

  const applyUpdate = async (): Promise<NoteDocument> => {
    if (
      hasParentChange &&
      !(await validateNoteMoveTarget({
        noteId,
        parentId: properties.parentId,
        userId,
      }))
    ) {
      throw httpError(400, "Cannot move note to itself or its descendant");
    }

    return updateNoteMeta(userId, noteId, properties);
  };

  const updatedNote = await applyUpdate();
  await recordUserTags(userId, properties.tags);
  return updatedNote;
};

/** @param userId 账号。@param parentId 父笔记。@param input 分页筛选。@returns 归属校验后的子笔记分页。 */
export const getUserNoteChildren = async (
  userId: string,
  parentId: string,
  input: NoteListQuery,
): Promise<NotePaginationResult> => {
  await assertOwnedNote(userId, parentId);
  return queryNotePage(userId, input, { parentId });
};

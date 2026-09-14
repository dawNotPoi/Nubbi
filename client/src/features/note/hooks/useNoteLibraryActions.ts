import { newNote, type Note, type NoteWithContent } from "@/api/note";
import {
  createNoteAtom,
  deleteSingleNoteAtom,
  updateNotePropertiesAtom,
} from "@/store/atom/noteAtom";
import { routes } from "@/utils/routes";
import { Modal, message } from "antd";
import { useAtomValue } from "jotai";
import type { Dispatch, SetStateAction } from "react";
import { useNavigate } from "react-router-dom";

type MessageApi = ReturnType<typeof message.useMessage>[0];

type UseNoteLibraryActionsOptions = {
  blockedMoveTargetIds: Set<string>;
  messageApi: MessageApi;
  moveCandidates: Note[];
  owner: string;
  refetch: () => Promise<unknown>;
  setMoveCandidates: Dispatch<SetStateAction<Note[]>>;
  setMoveOpen: Dispatch<SetStateAction<boolean>>;
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
};

export const useNoteLibraryActions = ({
  blockedMoveTargetIds,
  messageApi,
  moveCandidates,
  owner,
  refetch,
  setMoveCandidates,
  setMoveOpen,
  setSelectedIds,
}: UseNoteLibraryActionsOptions) => {
  const { mutateAsync: createNote } = useAtomValue(createNoteAtom);
  const { mutateAsync: deleteNote } = useAtomValue(deleteSingleNoteAtom);
  const { mutateAsync: updateNoteProperties, isPending: moving } =
    useAtomValue(updateNotePropertiesAtom);
  const navigate = useNavigate();

  const openNote = (note: Note) => {
    navigate(routes.note(note._id));
  };

  const createRootNote = async (note?: Partial<NoteWithContent>) => {
    if (!owner) return;

    const draft = newNote({
      parentId: null,
      ...note,
    });
    await createNote({ note: draft, owner });
    navigate(routes.note(draft._id));
  };

  const confirmDelete = (notes: Note[]) => {
    if (notes.length === 0) return;

    Modal.confirm({
      cancelText: "取消",
      content:
        notes.length === 1
          ? "该 note 及其子 note 会被递归删除，删除后不可恢复。"
          : `选中的 ${notes.length} 个 note 及其子 note 会被递归删除，删除后不可恢复。`,
      okButtonProps: { danger: true },
      okText: "删除",
      title: notes.length === 1 ? "删除 note" : `删除 ${notes.length} 个 note`,
      onOk: async () => {
        try {
          await Promise.all(
            notes.map((note) =>
              deleteNote({
                noteId: note._id,
                owner,
                parentId: note.parentId ?? null,
              }),
            ),
          );
          setSelectedIds((current) =>
            current.filter((id) => !notes.some((note) => note._id === id)),
          );
          messageApi.success("删除成功");
          await refetch();
        } catch {
          messageApi.error("删除失败，请稍后重试");
        }
      },
    });
  };

  const openMoveModal = (notes: Note[]) => {
    if (notes.length === 0) return;
    setMoveCandidates(notes);
    setMoveOpen(true);
  };

  const closeMoveModal = () => {
    setMoveOpen(false);
    setMoveCandidates([]);
  };

  const renameNote = async (note: Note, title: string) => {
    try {
      await updateNoteProperties({
        noteId: note._id,
        owner,
        parentId: note.parentId ?? null,
        properties: { title },
      });
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : "重命名失败，请稍后重试",
      );
    }
  };

  const moveToTarget = async (target: Note) => {
    if (blockedMoveTargetIds.has(target._id)) {
      messageApi.warning("不能移动到所选 note 或其子级");
      return;
    }

    try {
      await Promise.all(
        moveCandidates.map((note) =>
          updateNoteProperties({
            noteId: note._id,
            owner,
            parentId: note.parentId ?? null,
            properties: { parentId: target._id },
          }),
        ),
      );
      setSelectedIds((current) =>
        current.filter((id) => !blockedMoveTargetIds.has(id)),
      );
      closeMoveModal();
      messageApi.success("移动成功");
      await refetch();
    } catch (error) {
      messageApi.error(
        error instanceof Error
          ? error.message
          : "移动失败，请确认目标位置后重试",
      );
    }
  };

  return {
    closeMoveModal,
    confirmDelete,
    createRootNote,
    moveToTarget,
    moving,
    openMoveModal,
    openNote,
    renameNote,
  };
};

import { newNote, type Note, type NoteWithContent } from "@/api/note";
import {
  type AccountScope,
  isAccountScopeCurrent,
  requireAccountScope,
} from "@/features/auth/model/account-scope";
import { authLifecycleRegistry } from "@/features/auth/model/auth-lifecycle";
import { getTopLevelSelectedNotes } from "@/features/note/model/library";
import {
  createNoteAtom,
  deleteSingleNoteAtom,
  updateNotePropertiesAtom,
} from "@/store/atom/note/noteMutationAtom";
import { routes } from "@/utils/routes";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { toast, type NotificationApi } from "@/components/ui/toast";
import { useAtomValue } from "jotai";
import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useNavigate } from "react-router-dom";

type UseNoteLibraryActionsOptions = {
  allNotes: Note[];
  blockedMoveTargetIds: Set<string>;
  messageApi?: NotificationApi;
  moveCandidates: Note[];
  owner: string;
  refetch: () => Promise<unknown>;
  setMoveCandidates: Dispatch<SetStateAction<Note[]>>;
  setMoveOpen: Dispatch<SetStateAction<boolean>>;
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
};

export const useNoteLibraryActions = ({
  allNotes,
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
  const moveScopeRef = useRef<AccountScope | null>(null);
  const deleteConfirmDestroyRef = useRef<
    ReturnType<typeof confirmDialog>["destroy"] | null
  >(null);

  /**
   * 仅销毁本笔记库 hook 当前持有的删除确认框。
   * @returns 无返回值。
   */
  const destroyDeleteConfirm = useCallback((): void => {
    const destroy = deleteConfirmDestroyRef.current;
    if (!destroy) return;
    deleteConfirmDestroyRef.current = null;
    destroy();
  }, []);

  useEffect(() => {
    const unregister = authLifecycleRegistry.register({
      id: "note-library-delete-confirm",
      clear: destroyDeleteConfirm,
    });
    return () => {
      unregister();
      destroyDeleteConfirm();
    };
  }, [destroyDeleteConfirm]);

  const openNote = (note: Note) => {
    navigate(routes.note(note._id));
  };

  const createRootNote = async (note?: Partial<NoteWithContent>) => {
    if (!owner) return undefined;
    const scope = requireAccountScope();

    const createdAt = new Date().toISOString();
    const draft = newNote({
      createdAt,
      parentId: null,
      updatedAt: createdAt,
      ...note,
    });
    await createNote({ note: draft });
    if (!isAccountScopeCurrent(scope)) return undefined;
    return draft;
  };

  const confirmDelete = (notes: Note[]) => {
    if (notes.length === 0) return;

    const scope = requireAccountScope();
    const actionNotes = getTopLevelSelectedNotes(notes, allNotes);

    destroyDeleteConfirm();
    const confirm = confirmDialog({
      cancelText: "取消",
      content:
        notes.length === 1
          ? "该笔记及其子笔记将移至回收站，可在回收站中恢复或彻底删除。"
          : `选中的 ${notes.length} 个笔记及其子笔记将移至回收站，可在回收站中恢复或彻底删除。`,
      danger: true,
      okText: "删除",
      title: notes.length === 1 ? "删除 note" : `删除 ${notes.length} 个 note`,
      onOk: async () => {
        if (!isAccountScopeCurrent(scope)) return;
        try {
          for (const note of actionNotes) {
            await deleteNote({
              noteId: note._id,
              parentId: note.parentId,
            });
            if (!isAccountScopeCurrent(scope)) return;
          }
          setSelectedIds((current) =>
            current.filter((id) => !notes.some((note) => note._id === id)),
          );
          (messageApi ?? toast).success("删除成功");
          await refetch();
        } catch (error) {
          if (!isAccountScopeCurrent(scope)) return;
          (messageApi ?? toast).error("删除失败，请稍后重试");
          throw error;
        }
      },
    });
    deleteConfirmDestroyRef.current = confirm.destroy;
  };

  const openMoveModal = (notes: Note[]) => {
    if (notes.length === 0) return;
    moveScopeRef.current = requireAccountScope();
    setMoveCandidates(getTopLevelSelectedNotes(notes, allNotes));
    setMoveOpen(true);
  };

  const closeMoveModal = () => {
    moveScopeRef.current = null;
    setMoveOpen(false);
    setMoveCandidates([]);
  };

  const renameNote = async (note: Note, title: string) => {
    const scope = requireAccountScope();
    try {
      await updateNoteProperties({
        noteId: note._id,
        parentId: note.parentId,
        properties: { title },
      });
    } catch (error) {
      if (!isAccountScopeCurrent(scope)) return;
      (messageApi ?? toast).error(
        error instanceof Error ? error.message : "重命名失败，请稍后重试",
      );
    }
  };

  const moveToTarget = async (target: Note) => {
    const scope = moveScopeRef.current;
    if (!scope || !isAccountScopeCurrent(scope)) return;
    if (blockedMoveTargetIds.has(target._id)) {
      (messageApi ?? toast).warning("不能移动到所选 note 或其子级");
      return;
    }

    try {
      for (const note of moveCandidates) {
        await updateNoteProperties({
          noteId: note._id,
          parentId: note.parentId,
          properties: { parentId: target._id },
        });
        if (!isAccountScopeCurrent(scope)) return;
      }
      setSelectedIds((current) =>
        current.filter((id) => !blockedMoveTargetIds.has(id)),
      );
      closeMoveModal();
      (messageApi ?? toast).success("移动成功");
      await refetch();
    } catch (error) {
      if (!isAccountScopeCurrent(scope)) return;
      (messageApi ?? toast).error(
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

import { newNote, type Note, type NoteWithContent } from "@/api/note";
import {
  createNoteAtom,
  patchNotePropertiesCacheAtom,
  updateNoteContentAtom,
  updateNotePropertiesAtom,
} from "@/store/atom/noteAtom";
import { debounceWithControls } from "@/utils/common";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type SubmitDraftOptions = {
  onCreated?: (note: NoteWithContent) => void;
  onSubmitted?: () => void;
};

type UseCreateNoteDraftOptions = {
  owner?: string;
  parent: Note;
};

const DEFAULT_DRAFT_TITLE = "未命名文档";

const normalizeDraftTitle = (title: string) =>
  title.trim() ? title : DEFAULT_DRAFT_TITLE;

export const useCreateNoteDraft = ({
  owner,
  parent,
}: UseCreateNoteDraftOptions) => {
  const [targetNote, setTargetNote] = useState<Note | null>(parent);
  const [targetPickerOpen, setTargetPickerOpen] = useState(false);
  const [draftNote, setDraftNote] = useState<NoteWithContent | null>(null);
  const [title, setTitleState] = useState("");
  const [content, setContentState] = useState("");
  const titleRef = useRef("");
  const contentRef = useRef("");
  const draftNoteRef = useRef<NoteWithContent | null>(null);
  const createdNoteIdsRef = useRef(new Set<string>());
  const pendingContentSaveRef = useRef(new Map<string, string>());
  const pendingTitleSaveRef = useRef(
    new Map<string, { parentId?: string | null; title: string }>(),
  );
  const targetChangedByUserRef = useRef(false);
  const createNoteMutation = useAtomValue(createNoteAtom);
  const contentMutation = useAtomValue(updateNoteContentAtom);
  const propertiesMutation = useAtomValue(updateNotePropertiesAtom);
  const patchNotePropertiesCache = useSetAtom(patchNotePropertiesCacheAtom);
  const createNoteRef = useRef(createNoteMutation.mutate);
  const updateContentRef = useRef(contentMutation.mutate);
  const updatePropertiesRef = useRef(propertiesMutation.mutate);
  const resolvedTargetNote = targetChangedByUserRef.current
    ? targetNote
    : parent;

  useEffect(() => {
    createNoteRef.current = createNoteMutation.mutate;
  }, [createNoteMutation.mutate]);

  useEffect(() => {
    updateContentRef.current = contentMutation.mutate;
  }, [contentMutation.mutate]);

  useEffect(() => {
    updatePropertiesRef.current = propertiesMutation.mutate;
  }, [propertiesMutation.mutate]);

  const debouncedUpdateTitle = useMemo(
    () =>
      debounceWithControls(
        (
          noteId: string,
          nextTitle: string,
          parentId?: string | null,
        ) => {
          if (!createdNoteIdsRef.current.has(noteId)) {
            pendingTitleSaveRef.current.set(noteId, {
              parentId,
              title: nextTitle,
            });
            return;
          }

          updatePropertiesRef.current({
            owner,
            parentId: parentId ?? undefined,
            noteId,
            properties: { title: nextTitle },
          });
        },
        300,
      ),
    [owner],
  );

  const debouncedUpdateContent = useMemo(
    () =>
      debounceWithControls((noteId: string, nextContent: string) => {
        if (!createdNoteIdsRef.current.has(noteId)) {
          pendingContentSaveRef.current.set(noteId, nextContent);
          return;
        }

        updateContentRef.current({
          content: nextContent,
          noteId,
        });
      }, 800),
    [],
  );

  useEffect(() => {
    return () => {
      debouncedUpdateTitle.flush();
      debouncedUpdateContent.flush();
    };
  }, [debouncedUpdateContent, debouncedUpdateTitle]);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    if (targetChangedByUserRef.current) return;
    setTargetNote(parent);
  }, [parent]);

  const resetDraft = useCallback(() => {
    const currentDraftNoteId = draftNoteRef.current?._id;

    debouncedUpdateTitle.flush();
    debouncedUpdateContent.flush();
    titleRef.current = "";
    contentRef.current = "";
    draftNoteRef.current = null;
    if (currentDraftNoteId) {
      createdNoteIdsRef.current.delete(currentDraftNoteId);
    }
    targetChangedByUserRef.current = false;
    setTargetPickerOpen(false);
    setDraftNote(null);
    setTitleState("");
    setContentState("");
    setTargetNote(parent);
  }, [debouncedUpdateContent, debouncedUpdateTitle, parent]);

  const createDraftNote = useCallback(() => {
    if (draftNoteRef.current) {
      return draftNoteRef.current;
    }

    const note = newNote({
      content: contentRef.current,
      parentId: resolvedTargetNote?._id,
      title: normalizeDraftTitle(titleRef.current),
    });

    draftNoteRef.current = note;
    setDraftNote(note);
    createdNoteIdsRef.current.delete(note._id);
    createNoteRef.current(
      { owner, note },
      {
        onError: () => {
          createdNoteIdsRef.current.delete(note._id);
          pendingContentSaveRef.current.delete(note._id);
          pendingTitleSaveRef.current.delete(note._id);
        },
        onSuccess: () => {
          createdNoteIdsRef.current.add(note._id);

          const pendingTitle = pendingTitleSaveRef.current.get(note._id);
          if (pendingTitle) {
            pendingTitleSaveRef.current.delete(note._id);
            updatePropertiesRef.current({
              owner,
              parentId: pendingTitle.parentId ?? undefined,
              noteId: note._id,
              properties: { title: pendingTitle.title },
            });
          }

          const pendingContent = pendingContentSaveRef.current.get(note._id);
          if (pendingContent != null) {
            pendingContentSaveRef.current.delete(note._id);
            updateContentRef.current({
              content: pendingContent,
              noteId: note._id,
            });
          }

          if (draftNoteRef.current?._id !== note._id) {
            createdNoteIdsRef.current.delete(note._id);
          }
        },
      },
    );

    return note;
  }, [owner, resolvedTargetNote]);

  const selectParent = (nextParent: Note) => {
    targetChangedByUserRef.current = true;
    setTargetNote(nextParent);
    setTargetPickerOpen(false);

    const currentNote = draftNoteRef.current;
    if (!currentNote) return;

    const nextNote = {
      ...currentNote,
      parentId: nextParent._id,
    };
    draftNoteRef.current = nextNote;
    setDraftNote(nextNote);
    updatePropertiesRef.current({
      owner,
      parentId: currentNote.parentId ?? undefined,
      noteId: currentNote._id,
      properties: { parentId: nextParent._id },
    });
  };

  const syncTitle = (nextTitle: string) => {
    titleRef.current = nextTitle;
    setTitleState(nextTitle);

    const currentNote = draftNoteRef.current;
    if (!currentNote) return;

    const nextDraftTitle = normalizeDraftTitle(nextTitle);
    const nextNote = { ...currentNote, title: nextDraftTitle };
    draftNoteRef.current = nextNote;
    setDraftNote(nextNote);
    patchNotePropertiesCache({
      noteId: currentNote._id,
      properties: {
        parentId: currentNote.parentId ?? null,
        title: nextDraftTitle,
      },
    });
    debouncedUpdateTitle(
      currentNote._id,
      nextDraftTitle,
      currentNote.parentId,
    );
  };

  const syncContent = (nextContent: string) => {
    contentRef.current = nextContent;
    setContentState(nextContent);

    const currentNote = draftNoteRef.current;
    if (!currentNote) return;

    debouncedUpdateContent(currentNote._id, nextContent);
  };

  const submitDraft = ({ onCreated, onSubmitted }: SubmitDraftOptions = {}) => {
    const note = createDraftNote();

    debouncedUpdateTitle.flush();
    debouncedUpdateContent.flush();
    onCreated?.(note);
    resetDraft();
    onSubmitted?.();
  };

  return {
    createDraftNote,
    content,
    draftNote,
    resetDraft,
    selectParent,
    setTargetPickerOpen,
    submitDraft,
    syncContent,
    syncTitle,
    targetNote: resolvedTargetNote,
    targetPickerOpen,
    title,
  };
};

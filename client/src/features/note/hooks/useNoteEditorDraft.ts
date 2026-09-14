import type { NoteWithContent } from "@/api/note";
import {
  patchNotePropertiesCacheAtom,
  updateNotePropertiesAtom,
} from "@/store/atom/noteAtom";
import { debounceWithControls } from "@/utils/common";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NotePropertiesInput, NoteSaveStatus } from "../model/types";
import { useNoteContentDraft } from "./useNoteContentDraft";

type UseNoteEditorDraftOptions = {
  data?: NoteWithContent;
  defaultTitle: string;
  noteId?: string;
};

export const useNoteEditorDraft = ({
  data,
  defaultTitle,
  noteId,
}: UseNoteEditorDraftOptions) => {
  const propertiesMutation = useAtomValue(updateNotePropertiesAtom);
  const patchNotePropertiesCache = useSetAtom(patchNotePropertiesCacheAtom);
  const [title, setTitleState] = useState("");
  const [titleDebouncing, setTitleDebouncing] = useState(false);
  const [hasAutoSaved, setHasAutoSaved] = useState(false);
  const activeNoteIdRef = useRef<string>();
  const updatePropertiesRef = useRef(propertiesMutation.mutate);
  const {
    canApplyExternalContent,
    contentConflict,
    contentDebouncing,
    contentError,
    contentSaving,
    flushContent,
    hasContentActivity,
    setContent,
  } = useNoteContentDraft({ data, noteId });

  const { isPending: isPropertiesSaving } = propertiesMutation;

  useEffect(() => {
    updatePropertiesRef.current = propertiesMutation.mutate;
  }, [propertiesMutation.mutate]);

  const debouncedUpdateTitle = useMemo(
    () =>
      debounceWithControls(
        (
          nextNoteId: string,
          nextTitle: string,
          parentId?: string | null,
        ) => {
          setTitleDebouncing(false);
          updatePropertiesRef.current({
            parentId: parentId ?? undefined,
            noteId: nextNoteId,
            properties: { title: nextTitle },
          });
        },
        300,
      ),
    [],
  );

  useEffect(() => {
    return () => {
      debouncedUpdateTitle.flush();
      flushContent();
    };
  }, [debouncedUpdateTitle, flushContent, noteId]);

  useEffect(() => {
    const switchedNote = activeNoteIdRef.current !== noteId;

    if (switchedNote) {
      activeNoteIdRef.current = noteId;
      setTitleState(data?.title ?? "");
      setTitleDebouncing(false);
      setHasAutoSaved(false);
      return;
    }

    if (!titleDebouncing && !isPropertiesSaving) {
      setTitleState(data?.title ?? "");
    }
  }, [data?.title, isPropertiesSaving, noteId, titleDebouncing]);

  useEffect(() => {
    if (!hasAutoSaved && (titleDebouncing || hasContentActivity)) {
      setHasAutoSaved(true);
    }
  }, [hasAutoSaved, hasContentActivity, titleDebouncing]);

  const saveStatus: NoteSaveStatus = useMemo(() => {
    if (!hasAutoSaved) return "idle";
    if (contentConflict) return "conflict";
    if (contentError) return "error";
    if (
      titleDebouncing ||
      contentDebouncing ||
      contentSaving ||
      isPropertiesSaving
    ) {
      return "saving";
    }
    return "saved";
  }, [
    contentDebouncing,
    contentConflict,
    contentError,
    contentSaving,
    hasAutoSaved,
    isPropertiesSaving,
    titleDebouncing,
  ]);

  const headerTitle = useMemo(() => {
    return (title || data?.title || defaultTitle).trim() || defaultTitle;
  }, [data?.title, defaultTitle, title]);

  const setTitle = useCallback(
    (nextTitle: string) => {
      setTitleState(nextTitle);

      if (!noteId) return;

      setTitleDebouncing(true);
      patchNotePropertiesCache({
        noteId,
        properties: {
          parentId: data?.parentId ?? null,
          title: nextTitle,
        },
      });
      debouncedUpdateTitle(noteId, nextTitle, data?.parentId);
    },
    [data?.parentId, debouncedUpdateTitle, patchNotePropertiesCache, noteId],
  );

  const updateProperties = useCallback(
    (properties: NotePropertiesInput) => {
      if (!noteId) return;

      updatePropertiesRef.current({
        parentId: data?.parentId ?? undefined,
        noteId,
        properties,
      });
    },
    [data?.parentId, noteId],
  );

  return {
    headerTitle,
    canApplyExternalContent,
    saveStatus,
    setContent,
    setTitle,
    title,
    updateProperties,
  };
};

import type { NoteWithContent } from "@/api/note";
import {
  patchNotePropertiesCacheAtom,
  updateNoteContentAtom,
  updateNotePropertiesAtom,
} from "@/store/atom/noteAtom";
import { debounceWithControls } from "@/utils/common";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NotePropertiesInput, NoteSaveStatus } from "../model/types";

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
  const [contentMutation] = useAtom(updateNoteContentAtom);
  const propertiesMutation = useAtomValue(updateNotePropertiesAtom);
  const patchNotePropertiesCache = useSetAtom(patchNotePropertiesCacheAtom);
  const [title, setTitleState] = useState("");
  const [titleDebouncing, setTitleDebouncing] = useState(false);
  const [contentDebouncing, setContentDebouncing] = useState(false);
  const [hasAutoSaved, setHasAutoSaved] = useState(false);
  const activeNoteIdRef = useRef<string>();
  const updateContentRef = useRef(contentMutation.mutate);
  const updatePropertiesRef = useRef(propertiesMutation.mutate);

  const { isPending: isContentSaving } = contentMutation;
  const { isPending: isPropertiesSaving } = propertiesMutation;

  useEffect(() => {
    updateContentRef.current = contentMutation.mutate;
  }, [contentMutation.mutate]);

  useEffect(() => {
    updatePropertiesRef.current = propertiesMutation.mutate;
  }, [propertiesMutation.mutate]);

  const debouncedUpdateContent = useMemo(
    () =>
      debounceWithControls((nextNoteId: string, nextContent: string) => {
        setContentDebouncing(false);
        updateContentRef.current({
          content: nextContent,
          noteId: nextNoteId,
        });
      }, 800),
    [],
  );

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
      debouncedUpdateContent.flush();
    };
  }, [debouncedUpdateContent, debouncedUpdateTitle, noteId]);

  useEffect(() => {
    const switchedNote = activeNoteIdRef.current !== noteId;

    if (switchedNote) {
      activeNoteIdRef.current = noteId;
      setTitleState(data?.title ?? "");
      setTitleDebouncing(false);
      setContentDebouncing(false);
      setHasAutoSaved(false);
      return;
    }

    if (!titleDebouncing && !isPropertiesSaving) {
      setTitleState(data?.title ?? "");
    }
  }, [data?.title, isPropertiesSaving, noteId, titleDebouncing]);

  useEffect(() => {
    if (!hasAutoSaved && (titleDebouncing || contentDebouncing)) {
      setHasAutoSaved(true);
    }
  }, [contentDebouncing, hasAutoSaved, titleDebouncing]);

  const saveStatus: NoteSaveStatus = useMemo(() => {
    if (!hasAutoSaved) return "idle";
    if (
      titleDebouncing ||
      contentDebouncing ||
      isContentSaving ||
      isPropertiesSaving
    ) {
      return "saving";
    }
    return "saved";
  }, [
    contentDebouncing,
    hasAutoSaved,
    isContentSaving,
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

  const setContent = useCallback(
    (nextContent: string) => {
      if (!noteId) return;

      setContentDebouncing(true);
      debouncedUpdateContent(noteId, nextContent);
    },
    [debouncedUpdateContent, noteId],
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
    saveStatus,
    setContent,
    setTitle,
    title,
    updateProperties,
  };
};

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

/**
 * 笔记编辑器草稿管理 Hook。
 * 管理标题、属性及正文的本地草稿状态，自动防抖保存，
 * 追踪保存状态（空闲/保存中/已保存），并处理外部数据同步。
 * @param data 服务端返回的笔记数据。
 * @param defaultTitle 无标题时的默认标题。
 * @param noteId 当前笔记 ID。
 */
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
  const activeNoteIdRef = useRef<string | undefined>(undefined);
  const updatePropertiesRef = useRef(propertiesMutation.mutate);
  const {
    canApplyExternalContent,
    content,
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
          parentId: string | null | undefined,
          nextTitle: string,
        ) => {
          setTitleDebouncing(false);
          updatePropertiesRef.current({
            noteId: nextNoteId,
            parentId,
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
        parentId: data?.parentId,
        properties: { title: nextTitle },
      });
      debouncedUpdateTitle(noteId, data?.parentId, nextTitle);
    },
    [data?.parentId, debouncedUpdateTitle, patchNotePropertiesCache, noteId],
  );

  const updateProperties = useCallback(
    (properties: NotePropertiesInput) => {
      if (!noteId) return;

      updatePropertiesRef.current({
        noteId,
        parentId: data?.parentId,
        properties,
      });
    },
    [data?.parentId, noteId],
  );

  return {
    headerTitle,
    canApplyExternalContent,
    content,
    saveStatus,
    setContent,
    setTitle,
    title,
    updateProperties,
  };
};

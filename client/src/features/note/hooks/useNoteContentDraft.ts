import type { NoteWithContent } from "@/api/note";
import { updateNoteContentAtom } from "@/store/atom/note/noteMutationAtom";
import { debounceWithControls } from "@/utils/common";
import { useAtomValue } from "jotai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type UseNoteContentDraftOptions = {
  data?: NoteWithContent;
  noteId?: string;
};

const getRevision = (note?: NoteWithContent) => note?.contentRevision ?? 0;
const getContent = (note?: NoteWithContent) => note?.content ?? "";

/**
 * 笔记正文草稿管理 Hook。
 * 延迟自动保存正文内容，追踪本地修订版本号，
 * 确保外部更新时不会覆盖用户正在编辑的内容。
 * @param data 服务端返回的笔记数据。
 * @param noteId 当前笔记 ID，切换笔记时重置草稿状态。
 */
export const useNoteContentDraft = ({
  data,
  noteId,
}: UseNoteContentDraftOptions) => {
  const contentMutation = useAtomValue(updateNoteContentAtom);
  const updateContentRef = useRef(contentMutation.mutate);
  const activeNoteIdRef = useRef<string | undefined>(undefined);
  const activeSavingNoteIdRef = useRef<string | undefined>(undefined);
  const activeRequestIdRef = useRef<string | undefined>(undefined);
  const baseRevisionByNoteRef = useRef(new Map<string, number>());
  const draftContentByNoteRef = useRef(new Map<string, string>());
  const lastSavedContentByNoteRef = useRef(new Map<string, string>());
  const queuedContentByNoteRef = useRef(new Map<string, string>());
  const conflictBlockedNoteIdsRef = useRef(new Set<string>());
  const saveOrderRef = useRef<string[]>([]);
  const requestSequenceRef = useRef(0);
  const savingRef = useRef(false);
  const [contentDebouncing, setContentDebouncing] = useState(false);
  const [contentDirty, setContentDirty] = useState(false);
  const [contentSaving, setContentSaving] = useState(false);
  const [contentError, setContentError] = useState(false);
  const [contentConflict, setContentConflict] = useState(false);
  const [hasContentActivity, setHasContentActivity] = useState(false);
  const [, setActiveContent] = useState("");

  useEffect(() => {
    updateContentRef.current = contentMutation.mutate;
  }, [contentMutation.mutate]);

  const refreshActiveState = useCallback((nextNoteId = activeNoteIdRef.current) => {
    if (!nextNoteId) {
      setContentDirty(false);
      setContentSaving(false);
      return;
    }

    const draftContent = draftContentByNoteRef.current.get(nextNoteId) ?? "";
    const lastSavedContent =
      lastSavedContentByNoteRef.current.get(nextNoteId) ?? "";

    setContentDirty(draftContent !== lastSavedContent);
    setContentSaving(activeSavingNoteIdRef.current === nextNoteId);
  }, []);

  const startNextQueuedSaveRef = useRef<() => void>(() => {});

  const startSave = useCallback(
    (saveNoteId: string, content: string) => {
      savingRef.current = true;
      activeSavingNoteIdRef.current = saveNoteId;
      const clientMutationId = `${saveNoteId}:${Date.now()}:${++requestSequenceRef.current}`;
      activeRequestIdRef.current = clientMutationId;

      if (activeNoteIdRef.current === saveNoteId) {
        setContentSaving(true);
        setContentError(false);
        setContentConflict(false);
      }

      updateContentRef.current(
        {
          baseContentRevision: baseRevisionByNoteRef.current.get(saveNoteId) ?? 0,
          clientMutationId,
          content,
          noteId: saveNoteId,
        },
        {
          onError: () => {
            if (activeRequestIdRef.current !== clientMutationId) return;

            queuedContentByNoteRef.current.delete(saveNoteId);
            saveOrderRef.current = saveOrderRef.current.filter(
              (queuedNoteId) => queuedNoteId !== saveNoteId,
            );
            savingRef.current = false;
            activeSavingNoteIdRef.current = undefined;
            activeRequestIdRef.current = undefined;

            if (activeNoteIdRef.current === saveNoteId) {
              setContentError(true);
              setContentSaving(false);
              setContentDirty(true);
            }

            startNextQueuedSaveRef.current();
          },
          onSuccess: (response) => {
            if (activeRequestIdRef.current !== clientMutationId) return;

            const result = response.data;
            const responseNote = result?.note;
            savingRef.current = false;
            activeSavingNoteIdRef.current = undefined;
            activeRequestIdRef.current = undefined;

            if (result?.clientMutationId && result.clientMutationId !== clientMutationId) {
              startNextQueuedSaveRef.current();
              return;
            }

            if (result?.accepted && responseNote) {
              conflictBlockedNoteIdsRef.current.delete(saveNoteId);
              baseRevisionByNoteRef.current.set(
                saveNoteId,
                getRevision(responseNote),
              );
              lastSavedContentByNoteRef.current.set(
                saveNoteId,
                getContent(responseNote),
              );
            } else {
              queuedContentByNoteRef.current.delete(saveNoteId);
              saveOrderRef.current = saveOrderRef.current.filter(
                (queuedNoteId) => queuedNoteId !== saveNoteId,
              );
              if (result?.conflict) {
                conflictBlockedNoteIdsRef.current.add(saveNoteId);
              }
            }

            if (activeNoteIdRef.current === saveNoteId) {
              setContentSaving(false);
              setContentError(false);
              setContentConflict(Boolean(result && !result.accepted));
              refreshActiveState(saveNoteId);
            }

            startNextQueuedSaveRef.current();
          },
        },
      );
    },
    [refreshActiveState],
  );

  const startNextQueuedSave = useCallback(() => {
    if (savingRef.current) return;

    const nextNoteId = saveOrderRef.current.find((queuedNoteId) =>
      queuedContentByNoteRef.current.has(queuedNoteId),
    );

    if (!nextNoteId) return;

    saveOrderRef.current = saveOrderRef.current.filter(
      (queuedNoteId) => queuedNoteId !== nextNoteId,
    );
    const nextContent = queuedContentByNoteRef.current.get(nextNoteId);
    queuedContentByNoteRef.current.delete(nextNoteId);

    if (nextContent == null) {
      startNextQueuedSave();
      return;
    }

    const lastSavedContent =
      lastSavedContentByNoteRef.current.get(nextNoteId) ?? "";
    if (nextContent === lastSavedContent) {
      startNextQueuedSave();
      return;
    }

    startSave(nextNoteId, nextContent);
  }, [startSave]);

  useEffect(() => {
    startNextQueuedSaveRef.current = startNextQueuedSave;
  }, [startNextQueuedSave]);

  const enqueueSave = useCallback(
    (saveNoteId: string, content: string) => {
      queuedContentByNoteRef.current.set(saveNoteId, content);
      if (!saveOrderRef.current.includes(saveNoteId)) {
        saveOrderRef.current.push(saveNoteId);
      }
      startNextQueuedSaveRef.current();
    },
    [],
  );

  const debouncedUpdateContent = useMemo(
    () =>
      debounceWithControls((nextNoteId: string, nextContent: string) => {
        if (activeNoteIdRef.current === nextNoteId) {
          setContentDebouncing(false);
        }
        enqueueSave(nextNoteId, nextContent);
      }, 800),
    [enqueueSave],
  );

  useEffect(() => {
    return () => {
      debouncedUpdateContent.flush();
    };
  }, [debouncedUpdateContent, noteId]);

  useEffect(() => {
    const switchedNote = activeNoteIdRef.current !== noteId;

    if (switchedNote) {
      setContentDebouncing(false);
      setContentError(false);
      setContentConflict(Boolean(noteId && conflictBlockedNoteIdsRef.current.has(noteId)));

      if (!noteId || !data) {
        activeNoteIdRef.current = undefined;
        setActiveContent("");
        setHasContentActivity(false);
        refreshActiveState(undefined);
        return;
      }

      activeNoteIdRef.current = noteId;
      const serverContent = getContent(data);
      draftContentByNoteRef.current.set(noteId, serverContent);
      lastSavedContentByNoteRef.current.set(noteId, serverContent);
      baseRevisionByNoteRef.current.set(noteId, getRevision(data));
      setActiveContent(serverContent);
      setHasContentActivity(false);
      refreshActiveState(noteId);
      return;
    }

    if (!noteId || !data || contentDirty || contentSaving || contentDebouncing) return;

    const serverContent = getContent(data);
    draftContentByNoteRef.current.set(noteId, serverContent);
    lastSavedContentByNoteRef.current.set(noteId, serverContent);
    baseRevisionByNoteRef.current.set(noteId, getRevision(data));
    setActiveContent(serverContent);
    refreshActiveState(noteId);
  }, [
    contentDebouncing,
    contentDirty,
    contentSaving,
    data,
    noteId,
    refreshActiveState,
  ]);

  const setContent = useCallback(
    (nextContent: string) => {
      if (!noteId) return;

      draftContentByNoteRef.current.set(noteId, nextContent);
      setActiveContent(nextContent);
      setContentDirty(
        nextContent !== (lastSavedContentByNoteRef.current.get(noteId) ?? ""),
      );
      setContentError(false);
      const isConflictBlocked = conflictBlockedNoteIdsRef.current.has(noteId);
      setContentConflict(isConflictBlocked);
      setHasContentActivity(true);

      if (isConflictBlocked) {
        queuedContentByNoteRef.current.delete(noteId);
        saveOrderRef.current = saveOrderRef.current.filter(
          (queuedNoteId) => queuedNoteId !== noteId,
        );
        setContentDebouncing(false);
        return;
      }

      setContentDebouncing(true);
      debouncedUpdateContent(noteId, nextContent);
    },
    [debouncedUpdateContent, noteId],
  );

  const flushContent = useCallback(() => {
    debouncedUpdateContent.flush();
  }, [debouncedUpdateContent]);

  const discardLocalDraft = useCallback(() => {
    if (!noteId) return;

    const serverContent = getContent(data);
    draftContentByNoteRef.current.set(noteId, serverContent);
    lastSavedContentByNoteRef.current.set(noteId, serverContent);
    baseRevisionByNoteRef.current.set(noteId, getRevision(data));
    setActiveContent(serverContent);
    conflictBlockedNoteIdsRef.current.delete(noteId);
    queuedContentByNoteRef.current.delete(noteId);
    saveOrderRef.current = saveOrderRef.current.filter(
      (queuedNoteId) => queuedNoteId !== noteId,
    );
    setContentDebouncing(false);
    setContentError(false);
    setContentConflict(false);
    refreshActiveState(noteId);
  }, [data, noteId, refreshActiveState]);

  const acceptServerContent = discardLocalDraft;
  const canApplyExternalContent =
    !contentDirty && !contentSaving && !contentDebouncing;
  const activeContent = noteId
    ? draftContentByNoteRef.current.get(noteId)
    : undefined;

  return {
    acceptServerContent,
    canApplyExternalContent,
    content: activeContent ?? getContent(data),
    contentConflict,
    contentDebouncing,
    contentDirty,
    contentError,
    contentSaving,
    discardLocalDraft,
    flushContent,
    hasContentActivity,
    setContent,
  };
};

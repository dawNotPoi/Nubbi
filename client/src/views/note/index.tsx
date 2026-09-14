import TiptapEditor from "@/component/editor/Tiptap";
import { Header } from "@/component/Header";
import {
  postDetailAtom,
  updatePostContentAtom,
  updatePostPropertiesAtom,
} from "@/store/atom/postAtom";
import { debounceWrapper } from "@/utils/common";
import { useAtom, useAtomValue } from "jotai";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import "react-markdown-editor-lite/lib/index.css";
import { useNavigate, useParams } from "react-router-dom";
import "./index.css";
import NoteCard from "./NoteCard";
import NoteMeta from "./NoteMeta";

const DEFAULT_TITLE = "未命名文档";

type SaveStatus = "idle" | "saving" | "saved";

function NoteSkeleton() {
  return (
    <div className="min-w-[800px] animate-pulse">
      <div className="mx-6 mt-6 h-40 rounded-2xl bg-neutral-100" />
      <main className="mt-10 w-full items-center">
        <div className="mx-auto w-[50%] min-w-[600px]">
          <div className="h-12 w-2/3 rounded-lg bg-neutral-100" />
          <div className="mt-5 flex gap-3">
            <div className="h-8 w-24 rounded-md bg-neutral-100" />
            <div className="h-8 w-28 rounded-md bg-neutral-100" />
            <div className="h-8 w-20 rounded-md bg-neutral-100" />
          </div>
          <div className="mt-10 space-y-4">
            <div className="h-4 w-full rounded bg-neutral-100" />
            <div className="h-4 w-[92%] rounded bg-neutral-100" />
            <div className="h-4 w-[96%] rounded bg-neutral-100" />
            <div className="h-4 w-[78%] rounded bg-neutral-100" />
            <div className="h-4 w-[88%] rounded bg-neutral-100" />
            <div className="h-4 w-[70%] rounded bg-neutral-100" />
          </div>
        </div>
      </main>
    </div>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;

  const isSaving = status === "saving";

  return (
    <div className="flex items-center gap-2 text-xs text-neutral-500">
      {isSaving ? (
        <LoaderCircle className="size-4 animate-spin text-neutral-500" />
      ) : (
        <CheckCircle2 className="size-4 text-emerald-500" />
      )}
      <span>{isSaving ? "保存中..." : "已自动保存"}</span>
    </div>
  );
}

export default function Note() {
  const { Id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, refetch } = useAtomValue(postDetailAtom(Id!));
  const [contentMutation] = useAtom(updatePostContentAtom);
  const propertiesMutation = useAtomValue(updatePostPropertiesAtom);
  const [title, setTitle] = useState("");
  const [titleDebouncing, setTitleDebouncing] = useState(false);
  const [contentDebouncing, setContentDebouncing] = useState(false);
  const [hasAutoSaved, setHasAutoSaved] = useState(false);

  const { mutate: updatePostContent, isPending: isContentSaving } =
    contentMutation;
  const { mutate: updatePostProperties, isPending: isPropertiesSaving } =
    propertiesMutation;

  const debouncedUpdatePost = useCallback(
    debounceWrapper((postId: string, content: string) => {
      setContentDebouncing(false);
      updatePostContent({ postId, content });
    }),
    [updatePostContent],
  );

  const debouncedUpdateTitle = useMemo(
    () =>
      debounceWrapper((nextTitle: string, parentId?: string | null) => {
        if (!Id) return;
        setTitleDebouncing(false);
        updatePostProperties({
          postId: Id,
          properties: { title: nextTitle },
          parentId: parentId ?? undefined,
        });
      }, 300),
    [Id, updatePostProperties],
  );

  useEffect(() => {
    refetch();
  }, [Id, refetch]);

  useEffect(() => {
    setTitle(data?.title ?? "");
    setTitleDebouncing(false);
    setContentDebouncing(false);
    setHasAutoSaved(false);
  }, [Id, data?.title]);

  useEffect(() => {
    if (!hasAutoSaved && (titleDebouncing || contentDebouncing)) {
      setHasAutoSaved(true);
    }
  }, [contentDebouncing, hasAutoSaved, titleDebouncing]);

  const saveStatus: SaveStatus = useMemo(() => {
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

  const headerTitle = useMemo(
    () => (title || data?.title || DEFAULT_TITLE).trim(),
    [data?.title, title],
  );

  const Editor = useMemo(() => {
    if (isLoading || !Id || !data) return null;
    return (
      <TiptapEditor
        key={`${Id}:${data.updatedAt ?? ""}:${data.content?.length ?? 0}`}
        defaultValue={data.content}
        onChange={(markdown) => {
          setContentDebouncing(true);
          debouncedUpdatePost(Id, markdown);
        }}
      />
    );
  }, [Id, isLoading, data, debouncedUpdatePost]);

  if (!Id || isLoading || !data) return <NoteSkeleton />;

  return (
    <div className="min-w-[800px]">
      <Header className="mb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <button
              className="shrink-0 text-neutral-500 transition-colors hover:text-neutral-800"
              onClick={() => navigate("/table")}
              type="button"
            >
              笔记
            </button>
            <span className="shrink-0 text-neutral-300">/</span>
            <span className="truncate text-neutral-500">{headerTitle}</span>
          </div>
          <div className="shrink-0">
            <SaveIndicator status={saveStatus} />
          </div>
        </div>
      </Header>
      <NoteCard
        data={data}
        onUpdate={(newData) => {
          updatePostProperties({
            postId: Id,
            properties: newData,
            parentId: data.parentId ?? undefined,
          });
        }}
      />
      <main className="mt-10 w-full items-center">
        <div
          key={`${Id}:${data.updatedAt ?? ""}:${data.content?.length ?? 0}`}
          className="mx-auto w-[50%] min-w-[600px]"
        >
          <input
            className="w-full px-2 text-4xl font-extrabold outline-none"
            placeholder={DEFAULT_TITLE}
            value={title}
            onChange={(event) => {
              const nextTitle = event.target.value;
              setTitle(nextTitle);
              setTitleDebouncing(true);
              debouncedUpdateTitle(nextTitle, data.parentId);
            }}
          />
          <NoteMeta
            className="mt-4 -z-10"
            data={data}
            onUpdate={(newMeta) => {
              updatePostProperties({
                postId: Id,
                properties: { meta: newMeta },
                parentId: data.parentId ?? undefined,
              });
            }}
          />
          {Editor}
        </div>
      </main>
    </div>
  );
}

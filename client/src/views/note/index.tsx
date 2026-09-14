import TiptapEditor from "@/component/editor/Tiptap";
import { Header } from "@/component/Header";
import { useNoteEditorDraft } from "@/features/note/hooks/useNoteEditorDraft";
import type { NoteSaveStatus } from "@/features/note/model/types";
import { noteAncestorsAtom, noteDetailAtom } from "@/store/atom/noteAtom";
import { useAtomValue } from "jotai";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { useMemo } from "react";
import "react-markdown-editor-lite/lib/index.css";
import { useParams } from "react-router-dom";
import "./index.css";
import NoteBreadcrumb from "./NoteBreadcrumb";
import NoteCard from "./NoteCard";
import NoteMeta from "./NoteMeta";

const DEFAULT_TITLE = "未命名文档";

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

function SaveIndicator({ status }: { status: NoteSaveStatus }) {
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
  const { data, isLoading } = useAtomValue(noteDetailAtom(Id!));
  const { data: ancestors = [] } = useAtomValue(noteAncestorsAtom(Id!));
  const {
    headerTitle,
    saveStatus,
    setContent,
    setTitle,
    title,
    updateProperties,
  } = useNoteEditorDraft({
    data,
    defaultTitle: DEFAULT_TITLE,
    noteId: Id,
  });

  const Editor = useMemo(() => {
    if (isLoading || !Id || !data) return null;

    return (
      <TiptapEditor
        key={Id}
        defaultValue={data.content}
        onChange={setContent}
      />
    );
  }, [Id, isLoading, data, setContent]);

  if (!Id || isLoading || !data) return <NoteSkeleton />;

  return (
    <div className="min-w-[800px]">
      <Header className="mb-4">
        <div className="flex items-center justify-between gap-4">
          <NoteBreadcrumb
            ancestors={ancestors}
            current={{ _id: Id, title: headerTitle }}
          />
          <div className="shrink-0">
            <SaveIndicator status={saveStatus} />
          </div>
        </div>
      </Header>
      <NoteCard data={data} onUpdate={updateProperties} />
      <main className="mt-10 w-full items-center">
        <div className="mx-auto w-[50%] min-w-[600px]">
          <input
            className="w-full px-2  text-5xl font-extrabold outline-none"
            onChange={(event) => {
              setTitle(event.target.value);
            }}
            placeholder={DEFAULT_TITLE}
            value={title}
          />
          <NoteMeta
            className="mt-4 -z-10"
            data={data}
            onUpdate={(newMeta) => {
              updateProperties({ meta: newMeta });
            }}
          />
          {Editor}
        </div>
      </main>
    </div>
  );
}

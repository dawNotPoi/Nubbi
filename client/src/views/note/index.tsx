import TiptapEditor from "@/component/editor/Tiptap";
import { Header } from "@/component/Header";
import { useNoteEditorDraft } from "@/features/note/hooks/useNoteEditorDraft";
import type { NoteSaveStatus } from "@/features/note/model/types";
import { noteAncestorsAtom, noteDetailAtom } from "@/store/atom/noteAtom";
import { Switch } from "antd";
import { useAtomValue } from "jotai";
import {
  AlertCircle,
  CheckCircle2,
  Columns2,
  FilePenLine,
  LoaderCircle,
  PanelTop,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import "react-markdown-editor-lite/lib/index.css";
import { useParams } from "react-router-dom";
import "./index.css";
import NoteBreadcrumb from "./NoteBreadcrumb";
import NoteCover from "./NoteCover";
import NoteTags from "./NoteTags";

const DEFAULT_TITLE = "未命名文档";
const NOTE_DISPLAY_MODE_KEY = "note-display-mode";
const noteDisplayModes = ["render", "markdown", "split"] as const;

type NoteDisplayMode = (typeof noteDisplayModes)[number];

type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

const isNoteDisplayMode = (value: string | null): value is NoteDisplayMode => {
  return noteDisplayModes.includes(value as NoteDisplayMode);
};

const getStoredNoteDisplayMode = (): NoteDisplayMode => {
  if (typeof window === "undefined") return "render";

  const storedMode = window.localStorage.getItem(NOTE_DISPLAY_MODE_KEY);
  return isNoteDisplayMode(storedMode) ? storedMode : "render";
};

const getNextDisplayMode = (mode: NoteDisplayMode): NoteDisplayMode => {
  if (mode === "render") return "markdown";
  if (mode === "markdown") return "split";
  return "render";
};

const displayModeButtonMeta: Record<
  NoteDisplayMode,
  {
    Icon: typeof FilePenLine;
    label: string;
  }
> = {
  render: {
    Icon: FilePenLine,
    label: "Switch to Markdown edit",
  },
  markdown: {
    Icon: Columns2,
    label: "Switch to split preview",
  },
  split: {
    Icon: PanelTop,
    label: "Switch to rendered edit",
  },
};

function MarkdownEditor({ value, onChange, className }: MarkdownEditorProps) {
  return (
    <textarea
      aria-label="Markdown editor"
      className={`note-markdown-editor ${className ?? ""}`}
      onChange={(event) => {
        onChange(event.target.value);
      }}
      spellCheck={false}
      value={value}
    />
  );
}

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
  const isError = status === "error";
  const isConflict = status === "conflict";
  const label = isSaving
    ? "Saving..."
    : isConflict
      ? "Remote version changed"
      : isError
        ? "Save failed"
        : "Saved";

  return (
    <div className="flex items-center gap-2 text-xs text-neutral-500">
      {isSaving ? (
        <LoaderCircle className="size-4 animate-spin text-neutral-500" />
      ) : isError || isConflict ? (
        <AlertCircle className="size-4 text-amber-500" />
      ) : (
        <CheckCircle2 className="size-4 text-emerald-500" />
      )}
      <span>{label}</span>
    </div>
  );
}

export default function Note() {
  const { Id } = useParams();
  const { data, isLoading } = useAtomValue(noteDetailAtom(Id!));
  const { data: ancestors = [] } = useAtomValue(noteAncestorsAtom(Id!));
  const {
    canApplyExternalContent,
    content,
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
  const [displayMode, setDisplayMode] = useState<NoteDisplayMode>(
    getStoredNoteDisplayMode,
  );

  const switchDisplayMode = useCallback(() => {
    setDisplayMode((currentMode) => {
      const nextMode = getNextDisplayMode(currentMode);
      window.localStorage.setItem(NOTE_DISPLAY_MODE_KEY, nextMode);
      return nextMode;
    });
  }, []);

  const displayModeMeta = displayModeButtonMeta[displayMode];
  const DisplayModeIcon = displayModeMeta.Icon;

  const editorContent = useMemo(() => {
    if (isLoading || !Id || !data) return null;

    if (displayMode === "markdown") {
      return <MarkdownEditor onChange={setContent} value={content} />;
    }

    if (displayMode === "split") {
      return (
        <div className="note-split-editor">
          <div className="note-split-editor__pane">
            <MarkdownEditor onChange={setContent} value={content} />
          </div>
          <div className="note-split-editor__pane note-split-editor__preview">
            <TiptapEditor
              key={`${Id}:preview`}
              editable={false}
              serverValue={content}
              variant="preview"
            />
          </div>
        </div>
      );
    }

    return (
      <TiptapEditor
        key={Id}
        canApplyExternalContent={canApplyExternalContent}
        onChange={setContent}
        serverValue={content}
      />
    );
  }, [
    Id,
    canApplyExternalContent,
    content,
    displayMode,
    isLoading,
    data,
    setContent,
  ]);

  if (!Id || isLoading || !data) return <NoteSkeleton />;

  return (
    <div className="min-w-[800px]">
      <Header className="mb-4">
        <div className="flex items-center justify-between gap-4">
          <NoteBreadcrumb
            ancestors={ancestors}
            current={{ _id: Id, title: headerTitle }}
          />
          <div className="flex shrink-0 items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-neutral-500">
              <span>Published</span>
              <Switch
                checked={data.published}
                size="small"
                onChange={(published) => {
                  updateProperties({ published });
                }}
              />
            </label>
            <SaveIndicator status={saveStatus} />
            <button
              aria-label={displayModeMeta.label}
              className="note-display-mode-button"
              onClick={switchDisplayMode}
              title={displayModeMeta.label}
              type="button"
            >
              <DisplayModeIcon className="size-4" />
            </button>
          </div>
        </div>
      </Header>
      <main className="mt-10 w-full items-center">
        <div
          className={`note-editor-shell mx-auto ${
            displayMode === "split" ? "note-editor-shell--wide" : ""
          }`}
        >
          <NoteCover data={data} mode="cover" onUpdate={updateProperties} />
          <div className="group/title relative">
            {(!data.cover || data.tags.length === 0) ? (
              <div className="pointer-events-none absolute left-1 top-0 z-50 -translate-y-full pb-2 opacity-0 transition-opacity group-hover/title:opacity-100 group-focus-within/title:opacity-100">
                <div className="pointer-events-auto flex items-center gap-2">
                  {!data.cover ? (
                    <NoteCover
                      data={data}
                      mode="trigger"
                      onUpdate={updateProperties}
                    />
                  ) : null}
                  {data.tags.length === 0 ? (
                    <NoteTags
                      data={data}
                      mode="trigger"
                      onUpdate={updateProperties}
                    />
                  ) : null}
                </div>
              </div>
            ) : null}
            <NoteTags data={data} mode="tags" onUpdate={updateProperties} />
            <input
              className="w-full px-2 text-5xl font-extrabold outline-none"
              onChange={(event) => {
                setTitle(event.target.value);
              }}
              placeholder={DEFAULT_TITLE}
              value={title}
            />
          </div>
          {editorContent}
        </div>
      </main>
    </div>
  );
}

import TiptapEditor from "@/component/editor/Tiptap";
import HeadingTOC from "@/component/editor/Tiptap/HeadingTOC";
import { Header } from "@/component/Header";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { Editor } from "@tiptap/react";
import { useNoteEditorDraft } from "@/features/note/hooks/useNoteEditorDraft";
import type { NoteSaveStatus } from "@/features/note/model/types";
import { noteKeys } from "@/features/note/model/keys";
import { getNoteAncestors, getNoteDetail } from "@/api/note";
import { useQuery } from "@tanstack/react-query";
import { Switch } from "antd";
import {
  AlertCircle,
  CheckCircle2,
  Columns2,
  FilePenLine,
  ImagePlus,
  LoaderCircle,
  PanelTop,
  Tag,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import "react-markdown-editor-lite/lib/index.css";
import { useParams } from "react-router-dom";
import "./index.css";
import NoteBreadcrumb from "./NoteBreadcrumb";
import NoteCover from "./NoteCover";
import { DEFAULT_NOTE_COVER, DEFAULT_NOTE_TAG } from "./noteDefaults";
import NoteTags from "./NoteTags";
import NoteTitleActionButton from "./NoteTitleActionButton";

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
    <div className="min-w-0 animate-pulse">
      <main className="w-full items-center pt-10">
        <div className="mx-auto w-full max-w-[760px] px-4 sm:px-8">
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
    <div className="flex items-center gap-1 text-xs text-neutral-500 sm:gap-2" title={label}>
      {isSaving ? (
        <LoaderCircle className="size-4 animate-spin text-neutral-500" />
      ) : isError || isConflict ? (
        <AlertCircle className="size-4 text-amber-500" />
      ) : (
        <CheckCircle2 className="size-4 text-emerald-500" />
      )}
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
}

export default function Note() {
  const { Id } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: noteKeys.detail(Id!),
    queryFn: async () => {
      const response = await getNoteDetail(Id!);
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
  const { data: ancestors = [] } = useQuery({
    queryKey: noteKeys.ancestors(Id!),
    queryFn: async () => {
      const response = await getNoteAncestors(Id!);
      return response.data || [];
    },
    enabled: Boolean(Id),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
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
  const [mobileSplitPane, setMobileSplitPane] = useState<"source" | "preview">(
    "source",
  );
  const isMobile = useIsMobile();
  const [coverEditorOpen, setCoverEditorOpen] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);

  useEffect(() => {
    setCoverEditorOpen(false);
  }, [Id]);

  const switchDisplayMode = useCallback(() => {
    setDisplayMode((currentMode) => {
      const nextMode = getNextDisplayMode(currentMode);
      window.localStorage.setItem(NOTE_DISPLAY_MODE_KEY, nextMode);
      return nextMode;
    });
  }, []);

  const displayModeMeta = displayModeButtonMeta[displayMode];
  const DisplayModeIcon = displayModeMeta.Icon;

  const handleAddCover = useCallback(() => {
    if (!data?.cover) {
      updateProperties({ cover: DEFAULT_NOTE_COVER });
    }
  }, [data?.cover, updateProperties]);

  const handleAddTag = useCallback(() => {
    if (!data || data.tags.length > 0) return;
    updateProperties({ tags: [DEFAULT_NOTE_TAG] });
  }, [data, updateProperties]);

  const editorContent = useMemo(() => {
    if (isLoading || !Id || !data) return null;

    if (displayMode === "markdown") {
      return <MarkdownEditor onChange={setContent} value={content} />;
    }

    if (displayMode === "split" && isMobile) {
      return (
        <div className="mt-6">
          <div className="mb-3 inline-flex rounded-lg bg-bg-selected p-1 text-sm">
            <button
              className={`rounded-md px-3 py-1.5 ${
                mobileSplitPane === "source" ? "bg-white shadow-sm" : ""
              }`}
              onClick={() => setMobileSplitPane("source")}
              type="button"
            >
              Markdown
            </button>
            <button
              className={`rounded-md px-3 py-1.5 ${
                mobileSplitPane === "preview" ? "bg-white shadow-sm" : ""
              }`}
              onClick={() => setMobileSplitPane("preview")}
              type="button"
            >
              预览
            </button>
          </div>
          {mobileSplitPane === "source" ? (
            <MarkdownEditor onChange={setContent} value={content} />
          ) : (
            <div className="note-split-editor__preview">
              <TiptapEditor
                key={`${Id}:mobile-preview`}
                editable={false}
                serverValue={content}
                variant="preview"
              />
            </div>
          )}
        </div>
      );
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
        onEditorReady={setEditor}
        serverValue={content}
      />
    );
  }, [
    Id,
    canApplyExternalContent,
    content,
    displayMode,
    isLoading,
    isMobile,
    mobileSplitPane,
    data,
    setContent,
  ]);

  if (!Id || isLoading || !data) return <NoteSkeleton />;

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden">
      <Header>
        <div className="flex min-w-0 items-center justify-between gap-2 sm:gap-4">
          <NoteBreadcrumb
            ancestors={ancestors}
            current={{ _id: Id, title: headerTitle }}
          />
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <label className="flex items-center gap-1 text-xs text-neutral-500 sm:gap-2">
              <span className="hidden sm:inline">Published</span>
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
      <main className="min-h-0 flex-1 overflow-y-auto bg-white pb-10">
        <NoteCover
          className="mb-2"
          data={data}
          editorOpen={coverEditorOpen}
          onEditorOpenChange={setCoverEditorOpen}
          onUpdate={updateProperties}
        />
        {editor && !isMobile ? <HeadingTOC editor={editor} /> : null}
        <div
          className={`note-editor-shell mx-auto ${
            displayMode === "split" ? "note-editor-shell--wide" : ""
          } ${data.cover ? "" : "pt-6 md:pt-10"}`}
        >
          <div>
            <div
              className={`group/title relative inline-grid max-w-full align-top ${
                !data.cover || data.tags.length === 0 ? "pt-[30px]" : ""
              }`}
            >
              {!data.cover || data.tags.length === 0 ? (
                <div className="pointer-events-none absolute left-1 top-0 z-10 opacity-100 transition-opacity md:opacity-0 md:group-hover/title:opacity-100 md:group-focus-within/title:opacity-100">
                  <div className="pointer-events-auto flex items-center gap-2">
                    {!data.cover ? (
                      <NoteTitleActionButton
                        icon={<ImagePlus className="size-4" />}
                        onClick={handleAddCover}
                      >
                        添加封面
                      </NoteTitleActionButton>
                    ) : null}
                    {data.tags.length === 0 ? (
                      <NoteTitleActionButton
                        icon={<Tag className="size-4" />}
                        onClick={handleAddTag}
                      >
                        添加标签
                      </NoteTitleActionButton>
                    ) : null}
                  </div>
                </div>
              ) : null}
              <span
                aria-hidden="true"
                className="invisible col-start-1 row-start-1 max-w-full overflow-hidden whitespace-pre px-2 text-4xl font-extrabold md:text-5xl"
              >
                {title || DEFAULT_TITLE}
              </span>
              <input
                className="col-start-1 row-start-1 min-w-0 bg-transparent px-2 text-4xl font-extrabold outline-none md:text-5xl"
                onChange={(event) => {
                  setTitle(event.target.value);
                }}
                placeholder={DEFAULT_TITLE}
                value={title}
              />
            </div>
            <NoteTags data={data} onUpdate={updateProperties} />
          </div>
          {editorContent}
        </div>
      </main>
    </div>
  );
}

import TiptapEditor from "@/component/editor/Tiptap";
import HeadingTOC from "@/component/editor/Tiptap/HeadingTOC";
import { Header } from "@/component/Header";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { Editor } from "@tiptap/react";
import { useNoteEditorDraft } from "@/features/note/hooks/useNoteEditorDraft";
import type { NoteSaveStatus } from "@/features/note/model/types";
import { noteKeys } from "@/features/note/model/keys";
import { getNoteAncestors, getNoteDetail } from "@/api/note";
import { routes } from "@/utils/routes";
import { useQuery } from "@tanstack/react-query";
import { Switch } from "antd";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Columns2,
  FilePenLine,
  ImagePlus,
  LoaderCircle,
  MoreHorizontal,
  PanelTop,
  Tag,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import "react-markdown-editor-lite/lib/index.css";
import { useNavigate, useParams } from "react-router-dom";
import "./index.css";
import MobileNoteDetailSheet, { type MobileNoteDisplayMode } from "./MobileNoteDetailSheet";
import NoteBreadcrumb from "./NoteBreadcrumb";
import NoteCover from "./NoteCover";
import { DEFAULT_NOTE_COVER, DEFAULT_NOTE_TAG } from "./noteDefaults";
import NoteTags from "./NoteTags";
import NoteTitleActionButton from "./NoteTitleActionButton";

const DEFAULT_TITLE = "未命名文档";
const NOTE_DISPLAY_MODE_KEY = "note-display-mode";
const noteDisplayModes = ["render", "markdown", "split"] as const;
type NoteDisplayMode = MobileNoteDisplayMode;

type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

const isNoteDisplayMode = (value: string | null): value is NoteDisplayMode =>
  noteDisplayModes.includes(value as NoteDisplayMode);

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
  { Icon: typeof FilePenLine; label: string }
> = {
  render: { Icon: FilePenLine, label: "Switch to Markdown edit" },
  markdown: { Icon: Columns2, label: "Switch to split preview" },
  split: { Icon: PanelTop, label: "Switch to rendered edit" },
};

function MarkdownEditor({ value, onChange, className }: MarkdownEditorProps) {
  return (
    <textarea
      aria-label="Markdown editor"
      className={`note-markdown-editor ${className ?? ""}`}
      onChange={(event) => onChange(event.target.value)}
      spellCheck={false}
      value={value}
    />
  );
}

function NoteSkeleton() {
  return (
    <div className="min-w-0 animate-pulse">
      <main className="w-full items-center pt-10">
        <div className="mx-auto w-full max-w-[780px] px-4 sm:px-8">
          <div className="h-9 w-2/3 rounded-panel bg-bg-hover md:h-11" />
          <div className="mt-8 space-y-4">
            <div className="h-4 w-full rounded-compact bg-bg-hover" />
            <div className="h-4 w-[92%] rounded-compact bg-bg-hover" />
            <div className="h-4 w-[96%] rounded-compact bg-bg-hover" />
            <div className="h-4 w-[78%] rounded-compact bg-bg-hover" />
            <div className="h-4 w-[88%] rounded-compact bg-bg-hover" />
          </div>
        </div>
      </main>
    </div>
  );
}

function SaveIndicator({ compact = false, status }: { compact?: boolean; status: NoteSaveStatus }) {
  if (status === "idle") return null;

  const isSaving = status === "saving";
  const isError = status === "error";
  const isConflict = status === "conflict";
  if (compact && !isSaving && !isError && !isConflict) return null;

  const label = isSaving
    ? "Saving..."
    : isConflict
      ? "Remote version changed"
      : isError
        ? "Save failed"
        : "Saved";

  return (
    <div className="flex items-center gap-1 text-xs text-text-muted sm:gap-2" title={label}>
      {isSaving ? (
        <LoaderCircle className="size-4 animate-spin text-text-muted" />
      ) : isError || isConflict ? (
        <AlertCircle className="size-4 text-amber-500" />
      ) : (
        <CheckCircle2 className="size-4 text-emerald-600" />
      )}
      <span className={compact ? "sr-only" : "hidden sm:inline"}>{label}</span>
    </div>
  );
}

export default function Note() {
  const { Id } = useParams();
  const navigate = useNavigate();
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
  const [displayMode, setDisplayMode] = useState<NoteDisplayMode>(getStoredNoteDisplayMode);
  const [mobileSplitPane, setMobileSplitPane] = useState<"source" | "preview">("source");
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const isMobile = useIsMobile();
  const [coverEditorOpen, setCoverEditorOpen] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);

  useEffect(() => {
    setCoverEditorOpen(false);
    setMobileActionsOpen(false);
  }, [Id]);

  const setDisplayModePersisted = useCallback((nextMode: NoteDisplayMode) => {
    window.localStorage.setItem(NOTE_DISPLAY_MODE_KEY, nextMode);
    setDisplayMode(nextMode);
  }, []);

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
    if (!data?.cover) updateProperties({ cover: DEFAULT_NOTE_COVER });
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
        <div className="mt-5">
          <div className="mb-3 grid grid-cols-2 rounded-control bg-bg-hover p-1 text-[14px]">
            <button
              className={`min-h-9 rounded-compact ${
                mobileSplitPane === "source" ? "bg-surface font-medium shadow-[0_1px_2px_rgba(55,53,47,0.08)]" : "text-text-muted"
              }`}
              onClick={() => setMobileSplitPane("source")}
              type="button"
            >
              Markdown
            </button>
            <button
              className={`min-h-9 rounded-compact ${
                mobileSplitPane === "preview" ? "bg-surface font-medium shadow-[0_1px_2px_rgba(55,53,47,0.08)]" : "text-text-muted"
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
      <Header className="border-b border-border-row bg-surface/98">
        {isMobile ? (
          <div className="grid h-full grid-cols-[44px_minmax(0,1fr)_76px] items-center gap-1">
            <button
              aria-label="返回笔记"
              className="grid size-11 place-items-center rounded-control text-text-subtle transition-colors active:bg-bg-selected focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              onClick={() => navigate(routes.noteLib)}
              type="button"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div className="truncate text-center text-[14px] font-medium text-text-primary">{headerTitle}</div>
            <div className="flex items-center justify-end gap-1">
              <SaveIndicator compact status={saveStatus} />
              <button
                aria-label="笔记更多操作"
                className="grid size-11 place-items-center rounded-control text-text-subtle transition-colors active:bg-bg-selected focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                onClick={() => setMobileActionsOpen(true)}
                type="button"
              >
                <MoreHorizontal className="size-5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex min-w-0 items-center justify-between gap-4">
            <NoteBreadcrumb
              ancestors={ancestors}
              current={{ _id: Id, title: headerTitle }}
            />
            <div className="flex shrink-0 items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-text-muted">
                <span>Published</span>
                <Switch
                  checked={data.published}
                  size="small"
                  onChange={(published) => updateProperties({ published })}
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
        )}
      </Header>

      <main
        className="min-h-0 flex-1 overflow-y-auto bg-surface pb-[max(28px,env(safe-area-inset-bottom))] md:pb-10"
        data-note-scroll-container
      >
        <NoteCover
          className="mb-2"
          data={data}
          editorOpen={coverEditorOpen}
          onEditorOpenChange={setCoverEditorOpen}
          onUpdate={updateProperties}
        />
        {editor ? <HeadingTOC editor={editor} isMobile={isMobile} /> : null}
        <div
          className={`note-editor-shell mx-auto ${
            displayMode === "split" ? "note-editor-shell--wide" : ""
          } ${data.cover ? "" : "pt-4 md:pt-10"}`}
        >
          <div>
            <div
              className={`group/title relative inline-grid max-w-full align-top ${
                !data.cover || data.tags.length === 0 ? "md:pt-[30px]" : ""
              }`}
            >
              {!data.cover || data.tags.length === 0 ? (
                <div className="pointer-events-none absolute left-1 top-0 z-10 hidden opacity-0 transition-opacity md:block md:group-hover/title:opacity-100 md:group-focus-within/title:opacity-100">
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
                className="invisible col-start-1 row-start-1 max-w-full overflow-hidden whitespace-pre px-1 text-[30px] font-semibold leading-[1.2] tracking-[-0.015em] md:px-2 md:text-[42px] md:leading-[1.15]"
              >
                {title || DEFAULT_TITLE}
              </span>
              <input
                className="col-start-1 row-start-1 min-w-0 bg-transparent px-1 text-[30px] font-semibold leading-[1.2] tracking-[-0.015em] outline-none md:px-2 md:text-[42px] md:leading-[1.15]"
                onChange={(event) => setTitle(event.target.value)}
                placeholder={DEFAULT_TITLE}
                value={title}
              />
            </div>
            <NoteTags data={data} onUpdate={updateProperties} />
          </div>
          {editorContent}
        </div>
      </main>

      {isMobile ? (
        <MobileNoteDetailSheet
          displayMode={displayMode}
          hasCover={Boolean(data.cover)}
          hasTags={data.tags.length > 0}
          open={mobileActionsOpen}
          published={data.published}
          title={headerTitle}
          onAddCover={handleAddCover}
          onAddTag={handleAddTag}
          onDisplayModeChange={setDisplayModePersisted}
          onOpenChange={setMobileActionsOpen}
          onPublishedChange={(published) => updateProperties({ published })}
        />
      ) : null}
    </div>
  );
}

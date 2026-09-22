import { type Note } from "@/api/note";
import { Modal } from "@/components/ui/dialog";
import Popover from "@/component/UI/Popover";
import TiptapEditor from "@/component/editor/Tiptap";
import { NoteTargetPickerPanel } from "@/features/note/components/NoteTargetPicker";
import { useCreateNoteDraft } from "@/features/note/hooks/useCreateNoteDraft";
import { getRecentTargetNotes } from "@/features/note/model/library";
import { allNotesAtom, recentNoteAtom } from "@/store/atom/note/noteAtom";
import clsx from "clsx";
import { useAtomValue } from "jotai";
import { Expand, FileText, Plus } from "lucide-react";
import { cloneElement, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const DEFAULT_TITLE = "未命名文档";

type WritingModalProps = {
  parent: Note;
  onTrigger?: () => void;
  trigger?: React.ReactElement;
};

type LazyTargetPickerProps = {
  blockedIds: Set<string>;
  onCancel: () => void;
  onSelect: (note: Note) => void;
  selectedId?: string;
};

function LazyTargetPicker({
  blockedIds,
  onCancel,
  onSelect,
  selectedId,
}: LazyTargetPickerProps) {
  const { data: allNotes = [], isLoading: allNotesLoading } = useAtomValue(allNotesAtom);
  const { data: recentNotes = [], isLoading: recentNotesLoading } = useAtomValue(recentNoteAtom);
  const targets = useMemo(
    () => getRecentTargetNotes(recentNotes, allNotes),
    [allNotes, recentNotes],
  );

  return (
    <NoteTargetPickerPanel
      allNotes={allNotes}
      autoFocus
      blockedIds={blockedIds}
      className="h-[min(440px,65dvh)] w-[min(420px,calc(100vw-32px))]"
      disabled={allNotesLoading || recentNotesLoading}
      emptyMessage={
        allNotesLoading || recentNotesLoading ? "正在加载..." : "暂无可添加的位置"
      }
      onCancel={onCancel}
      onSelect={onSelect}
      placeholder="添加到..."
      selectedId={selectedId}
      targets={targets}
    />
  );
}

/**
 * 新建笔记弹窗。
 * 点击触发元素后在弹窗内编辑标题和内容，支持选择存放位置。
 * @param parent 默认存放的父级笔记。
 * @param onTrigger 触发时额外回调。
 * @param trigger 自定义触发元素，默认显示 Plus 图标。
 */
export const WrittingModal = ({ parent, onTrigger, trigger }: WritingModalProps) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const draft = useCreateNoteDraft({ parent });
  const blockedTargetIds = useMemo(() => {
    return new Set(draft.draftNote ? [draft.draftNote._id] : []);
  }, [draft.draftNote]);

  const closeModal = () => {
    draft.resetDraft();
    setOpen(false);
  };

  const createNoteHandler = () => {
    draft.submitDraft({
      onCreated: (note) => {
        navigate(`/note/${note._id}`);
      },
      onSubmitted: () => {
        setOpen(false);
      },
    });
  };

  const triggerElement = cloneElement(
    (trigger ?? <Plus className="size-full" />) as React.ReactElement<
      Record<string, unknown>
    >,
    {
      onClick: (event: React.MouseEvent) => {
        (
          trigger?.props as { onClick?: (e: React.MouseEvent) => void }
        )?.onClick?.(event);
        onTrigger?.();
        draft.createDraftNote();
        setOpen(true);
      },
    },
  );

  return (
    <>
      {triggerElement}
      <Modal
        className={clsx(
          "h-[90dvh] w-full !max-h-[90dvh] !overflow-hidden",
          "rounded-t-sheet border border-border-toolbar bg-white shadow-soft",
          "md:h-[88dvh] md:!max-h-[860px]",
          "md:!w-[min(94vw,1120px)] md:max-w-[1120px] md:!rounded-panel",
        )}
        onCancel={closeModal}
        open={open}
        showClose
        title={
          <div className="flex min-w-0 items-center gap-2 py-1 text-sm">
            <button
              aria-label="在完整页面中打开"
              className={clsx(
                "grid size-8 shrink-0 place-items-center rounded-control text-text-muted transition-colors",
                "hover:bg-bg-icon-hover hover:text-text-primary",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring",
              )}
              onClick={createNoteHandler}
              type="button"
            >
              <Expand className="size-4" />
            </button>
            <span
              aria-hidden="true"
              className="mx-1 h-5 w-px shrink-0 bg-border-row"
            />
            <Popover
              className="overflow-hidden rounded-panel border border-border-toolbar bg-white shadow-soft"
              onClickOutside={() => {
                draft.setTargetPickerOpen(false);
              }}
              open={draft.targetPickerOpen}
              trigger={
                <button
                  className={clsx(
                    "flex h-8 min-w-0 items-center gap-2 rounded-control px-2 text-text-muted transition-colors",
                    "hover:bg-bg-hover hover:text-text-primary",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring",
                  )}
                  onClick={() => {
                    draft.setTargetPickerOpen(!draft.targetPickerOpen);
                  }}
                  type="button"
                >
                  <span className="hidden shrink-0 text-text-subtle sm:inline">
                    存放到
                  </span>
                  <FileText className="size-4 shrink-0 text-text-subtle" />
                  <span className="max-w-[180px] truncate font-medium text-text-primary sm:max-w-[280px]">
                    {draft.targetNote?.title || DEFAULT_TITLE}
                  </span>
                </button>
              }
            >
              {draft.targetPickerOpen ? (
                <LazyTargetPicker
                  blockedIds={blockedTargetIds}
                  onCancel={() => draft.setTargetPickerOpen(false)}
                  onSelect={draft.selectParent}
                  selectedId={draft.targetNote?._id}
                />
              ) : null}
            </Popover>
          </div>
        }
      >
        <main className="-mx-4 flex h-[calc(90dvh-80px)] min-h-0 flex-col md:h-[calc(88dvh-80px)] md:max-h-[780px]">
          <section className="min-h-0 flex-1 overflow-y-auto bg-white scrollbar-thin scrollbar-thumb-border">
            <div className="mx-auto min-h-full w-full max-w-[840px] px-5 py-8 sm:px-10 sm:py-12">
              <header className="mb-2">
                <input
                  autoFocus
                  className={clsx(
                    "w-full border-none bg-transparent py-2 text-3xl font-bold tracking-tight text-text-primary outline-none sm:text-4xl",
                    "placeholder:text-text-placeholder",
                  )}
                  onChange={(event) => {
                    draft.syncTitle(event.target.value);
                  }}
                  placeholder={DEFAULT_TITLE}
                  type="text"
                  value={draft.title}
                />
              </header>
              <TiptapEditor
                className="min-h-[420px]"
                defaultValue={draft.content}
                onChange={draft.syncContent}
              />
            </div>
          </section>
        </main>
      </Modal>
    </>
  );
};

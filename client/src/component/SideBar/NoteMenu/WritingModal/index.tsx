import { type Note } from "@/api/note";
import { Modal } from "@/component/UI/Dialog";
import { Divider } from "@/component/UI/Divider";
import Popover from "@/component/UI/Popover";
import TiptapEditor from "@/component/editor/Tiptap";
import { NoteTargetPickerPanel } from "@/features/note/components/NoteTargetPicker";
import { useCreateNoteDraft } from "@/features/note/hooks/useCreateNoteDraft";
import { getRecentTargetNotes } from "@/features/note/model/library";
import { allNotesAtom, recentNoteAtom } from "@/store/atom/noteAtom";
import clsx from "clsx";
import { useAtomValue } from "jotai";
import { cloneElement, useMemo, useState } from "react";
import { Expand, FileText, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { IconButton } from "../../components";

const DEFAULT_TITLE = "未命名文档";

export const WrittingModal = ({
  parent,
  owner,
  onTrigger,
  trigger,
}: {
  parent: Note;
  owner?: string;
  onTrigger?: () => void;
  trigger?: React.ReactElement;
}) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const draft = useCreateNoteDraft({ owner, parent });
  const { data: allNotes = [] } = useAtomValue(allNotesAtom(owner ?? ""));
  const { data: recentNotes = [] } = useAtomValue(recentNoteAtom);
  const addToTargets = useMemo(
    () => getRecentTargetNotes(recentNotes, allNotes),
    [allNotes, recentNotes],
  );
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
    trigger ?? <Plus className="size-full" />,
    {
      onClick: (event: React.MouseEvent) => {
        trigger?.props.onClick?.(event);
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
        open={open}
        className={clsx(
          "h-[80%] min-h-[320px] w-full max-w-3xl md:max-w-4xl lg:max-w-5xl",
          "rounded-2xl border border-neutral-200/80 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.12)]",
        )}
        onCancel={closeModal}
        title={
          <div className="flex items-center justify-start gap-2 text-sm text-neutral-500">
            <IconButton
              className={clsx(
                "flex size-8 items-center justify-center rounded-md text-neutral-500 transition-colors",
                "hover:bg-neutral-100 hover:text-neutral-700",
              )}
              onClick={createNoteHandler}
            >
              <Expand />
            </IconButton>
            <Divider orientation="vertical" className="mx-1 my-2 h-5" />
            <Popover
              className="overflow-hidden rounded-xl border border-[#deddda] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
              onClickOutside={() => {
                draft.setTargetPickerOpen(false);
              }}
              open={draft.targetPickerOpen}
              trigger={
                <button
                  className={clsx(
                    "flex h-8 items-center gap-2 rounded-md px-2 text-center text-neutral-500 transition-colors",
                    "hover:bg-neutral-100 hover:text-neutral-700",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300",
                  )}
                  onClick={() => {
                    draft.setTargetPickerOpen(!draft.targetPickerOpen);
                  }}
                  type="button"
                >
                  <span className="text-neutral-400">Add to</span>
                  <FileText className="text-neutral-400" />
                  <span className="max-w-[220px] truncate font-medium text-neutral-900">
                    {draft.targetNote?.title || DEFAULT_TITLE}
                  </span>
                </button>
              }
            >
              <NoteTargetPickerPanel
                allNotes={allNotes}
                autoFocus
                blockedIds={blockedTargetIds}
                className="h-[360px] w-[360px]"
                emptyMessage="暂无可添加的位置"
                onCancel={() => draft.setTargetPickerOpen(false)}
                onSelect={draft.selectParent}
                placeholder="添加到..."
                selectedId={draft.targetNote?._id}
                targets={addToTargets}
              />
            </Popover>
          </div>
        }
      >
        <main className="h-full max-h-[70vh] cursor-text overflow-y-auto px-8 py-8 md:px-10">
          <header className="mb-3">
            <input
              className={clsx(
                "w-full border-none bg-transparent py-2 text-3xl font-semibold tracking-tight text-neutral-900 outline-none",
                "placeholder:text-neutral-300",
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
            defaultValue={draft.content}
            onChange={draft.syncContent}
          />
        </main>
      </Modal>
    </>
  );
};

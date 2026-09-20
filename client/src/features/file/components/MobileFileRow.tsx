import type { FileListItem } from "@/api/file";
import { Input } from "@/components/ui/input";
import { getFileMobileMeta } from "@/features/file/model";
import { useLongPress } from "@/hooks/useLongPress";
import { Check, FileText, Folder, MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { MobileFileActionsSheet } from "./MobileFileActionsSheet";

type MobileFileRowProps = {
  editing: boolean;
  item: FileListItem;
  selecting: boolean;
  selected: boolean;
  onCancelRename: () => void;
  onDelete: (item: FileListItem) => void;
  onDownload: (item: FileListItem) => void;
  onEnterSelection: (item: FileListItem) => void;
  onMove: (item: FileListItem) => void;
  onOpen: (item: FileListItem) => void;
  onRename: (item: FileListItem, name: string) => Promise<boolean> | boolean | void;
  onShare: (item: FileListItem) => void;
  onToggleSelection: (item: FileListItem, selected: boolean) => void;
};

export function MobileFileRow({
  editing,
  item,
  onCancelRename,
  onDelete,
  onDownload,
  onEnterSelection,
  onMove,
  onOpen,
  onRename,
  onShare,
  onToggleSelection,
  selected,
  selecting,
}: MobileFileRowProps) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const [draftName, setDraftName] = useState(item.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipBlurCommitRef = useRef(false);
  const { consumeTriggered, longPressProps } = useLongPress<HTMLButtonElement>(
    () => onEnterSelection(item),
    { disabled: selecting || editing },
  );

  useEffect(() => {
    setDraftName(item.name);
  }, [item.name]);

  useEffect(() => {
    if (!editing) return;
    skipBlurCommitRef.current = false;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  const handleOpen = () => {
    if (consumeTriggered()) return;
    if (selecting) {
      onToggleSelection(item, !selected);
      return;
    }
    onOpen(item);
  };

  const finishRename = async () => {
    const nextName = draftName.trim();
    if (!nextName) {
      setDraftName(item.name);
      onCancelRename();
      return;
    }
    if (nextName === item.name) {
      onCancelRename();
      return;
    }
    const result = await onRename(item, nextName);
    if (result !== false) onCancelRename();
  };

  const commitFromKeyboard = async () => {
    skipBlurCommitRef.current = true;
    await finishRename();
  };

  const LeadingIcon = item.kind === "folder" ? Folder : FileText;
  const iconTone =
    item.kind === "folder"
      ? "bg-[var(--entity-folder-soft)] text-[var(--entity-folder)]"
      : "bg-[var(--entity-file-soft)] text-[var(--entity-file)]";

  return (
    <>
      <li
        className={clsx(
          "grid min-h-[68px] grid-cols-[44px_minmax(0,1fr)_44px] items-center border-b border-border-row transition-colors",
          selected && "bg-bg-selected",
        )}
      >
        <div className="grid h-full min-h-11 place-items-center">
          {selecting ? (
            <button
              aria-label={`${selected ? "取消选择" : "选择"}：${item.name}`}
              aria-pressed={selected}
              className="grid size-10 place-items-center rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              onClick={() => onToggleSelection(item, !selected)}
              type="button"
            >
              <span
                className={clsx(
                  "grid size-[22px] place-items-center rounded-full border",
                  selected
                    ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                    : "border-border-button-hover bg-surface",
                )}
              >
                {selected ? <Check className="size-[14px]" strokeWidth={2.5} /> : null}
              </span>
            </button>
          ) : (
            <span className={clsx("grid size-8 place-items-center rounded-control", iconTone)}>
              <LeadingIcon className="size-[19px]" strokeWidth={1.9} />
            </span>
          )}
        </div>

        {editing ? (
          <div className="min-w-0 py-2 pr-2">
            <Input
              ref={inputRef}
              aria-label="重命名"
              className="h-10 rounded-control px-3 pl-3 text-[15px]"
              value={draftName}
              onBlur={() => {
                if (skipBlurCommitRef.current) {
                  skipBlurCommitRef.current = false;
                  return;
                }
                void finishRename();
              }}
              onChange={(event) => setDraftName(event.target.value)}
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing) return;
                if (event.key === "Enter") {
                  event.preventDefault();
                  void commitFromKeyboard();
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  skipBlurCommitRef.current = true;
                  setDraftName(item.name);
                  onCancelRename();
                }
              }}
            />
          </div>
        ) : (
          <button
            {...longPressProps}
            className="min-w-0 py-2.5 pr-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus-ring"
            onClick={handleOpen}
            type="button"
          >
            <div className="truncate text-[15px] font-medium leading-5 text-text-primary">{item.name}</div>
            <div className="mt-1 truncate text-[12px] leading-4 text-text-muted">
              {getFileMobileMeta(item)}
            </div>
          </button>
        )}

        <div className="grid h-full min-h-11 place-items-center">
          {!selecting && !editing ? (
            <button
              aria-label={`更多操作：${item.name}`}
              className="grid size-10 place-items-center rounded-control text-text-subtle transition-colors active:bg-bg-selected focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              onClick={() => setActionsOpen(true)}
              type="button"
            >
              <MoreHorizontal className="size-[19px]" />
            </button>
          ) : null}
        </div>
      </li>

      <MobileFileActionsSheet
        item={item}
        open={actionsOpen}
        onDelete={onDelete}
        onDownload={onDownload}
        onMove={onMove}
        onOpenChange={setActionsOpen}
        onRename={onRename}
        onSelect={onEnterSelection}
        onShare={onShare}
      />
    </>
  );
}

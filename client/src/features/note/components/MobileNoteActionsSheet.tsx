import type { Note } from "@/api/note";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetRow,
  SheetSeparator,
  SheetTitle,
} from "@/components/ui/sheet";
import { normalizeNoteTitle } from "@/features/note/model/hierarchy";
import { FolderInput, LocateFixed, Pencil, Rows3, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type MobileNoteActionsSheetProps = {
  note: Note;
  open: boolean;
  allowReveal?: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (note: Note) => void;
  onMove: (note: Note) => void;
  onRename: (note: Note, title: string) => void;
  onSelect: (note: Note) => void;
  onReveal?: (note: Note) => void;
};

export function MobileNoteActionsSheet({
  allowReveal = false,
  note,
  onDelete,
  onMove,
  onOpenChange,
  onRename,
  onReveal,
  onSelect,
  open,
}: MobileNoteActionsSheetProps) {
  const [mode, setMode] = useState<"actions" | "rename">("actions");
  const [draftTitle, setDraftTitle] = useState(normalizeNoteTitle(note.title));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setMode("actions");
    setDraftTitle(normalizeNoteTitle(note.title));
  }, [note._id, note.title, open]);

  useEffect(() => {
    if (mode !== "rename") return;
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, [mode]);

  const closeThen = (action: () => void) => {
    onOpenChange(false);
    action();
  };

  const saveRename = () => {
    const nextTitle = normalizeNoteTitle(draftTitle);
    if (nextTitle !== normalizeNoteTitle(note.title)) onRename(note, nextTitle);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent showClose>
        {mode === "rename" ? (
          <>
            <SheetHeader>
              <SheetTitle>重命名</SheetTitle>
              <SheetDescription>修改当前笔记标题。</SheetDescription>
            </SheetHeader>
            <Input
              ref={inputRef}
              className="h-11 rounded-[8px] px-3 pl-3 text-[16px]"
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing) return;
                if (event.key === "Enter") {
                  event.preventDefault();
                  saveRename();
                }
              }}
            />
            <div className="mt-4 flex gap-2">
              <Button className="h-11 flex-1 rounded-[8px]" variant="ghost" onClick={() => setMode("actions")}>
                返回
              </Button>
              <Button className="h-11 flex-1 rounded-[8px]" variant="primary" onClick={saveRename}>
                保存
              </Button>
            </div>
          </>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>{normalizeNoteTitle(note.title)}</SheetTitle>
              <SheetDescription>笔记操作</SheetDescription>
            </SheetHeader>
            <div className="space-y-0.5">
              <SheetRow onClick={() => setMode("rename")}>
                <Pencil />
                <span>重命名</span>
              </SheetRow>
              <SheetRow onClick={() => closeThen(() => onMove(note))}>
                <FolderInput />
                <span>移动</span>
              </SheetRow>
              <SheetRow onClick={() => closeThen(() => onSelect(note))}>
                <Rows3 />
                <span>选择</span>
              </SheetRow>
              {allowReveal && onReveal ? (
                <SheetRow onClick={() => closeThen(() => onReveal(note))}>
                  <LocateFixed />
                  <span>在目录中定位</span>
                </SheetRow>
              ) : null}
            </div>
            <SheetSeparator />
            <SheetRow
              className="text-[var(--danger-text)] [&>svg]:text-[var(--danger-text)] active:bg-[var(--danger-bg)] hover:bg-[var(--danger-bg)]"
              onClick={() => closeThen(() => onDelete(note))}
            >
              <Trash2 />
              <span>删除</span>
            </SheetRow>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

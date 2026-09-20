import type { FileListItem } from "@/api/file";
import { Button } from "@/components/ui/button";
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
import {
  Download,
  FolderInput,
  Link2,
  Pencil,
  Rows3,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type MobileFileActionsSheetProps = {
  item: FileListItem;
  open: boolean;
  onDelete: (item: FileListItem) => void;
  onDownload: (item: FileListItem) => void;
  onMove: (item: FileListItem) => void;
  onOpenChange: (open: boolean) => void;
  onRename: (item: FileListItem, name: string) => Promise<boolean> | boolean | void;
  onSelect: (item: FileListItem) => void;
  onShare: (item: FileListItem) => void;
};

export function MobileFileActionsSheet({
  item,
  onDelete,
  onDownload,
  onMove,
  onOpenChange,
  onRename,
  onSelect,
  onShare,
  open,
}: MobileFileActionsSheetProps) {
  const [mode, setMode] = useState<"actions" | "rename">("actions");
  const [name, setName] = useState(item.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setMode("actions");
    setName(item.name);
  }, [item._id, item.name, open]);

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

  const saveRename = async () => {
    const nextName = name.trim();
    if (!nextName || nextName === item.name) {
      onOpenChange(false);
      return;
    }
    const result = await onRename(item, nextName);
    if (result !== false) onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent showClose>
        {mode === "rename" ? (
          <>
            <SheetHeader>
              <SheetTitle>重命名</SheetTitle>
              <SheetDescription>{item.kind === "folder" ? "修改文件夹名称" : "修改文件名称"}</SheetDescription>
            </SheetHeader>
            <Input
              ref={inputRef}
              aria-label="名称"
              className="h-11 rounded-[8px] px-3 pl-3 text-[16px]"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing) return;
                if (event.key === "Enter") {
                  event.preventDefault();
                  void saveRename();
                }
              }}
            />
            <div className="mt-4 flex gap-2">
              <Button className="h-11 flex-1 rounded-[8px]" variant="ghost" onClick={() => setMode("actions")}>
                返回
              </Button>
              <Button className="h-11 flex-1 rounded-[8px]" variant="primary" onClick={() => void saveRename()}>
                保存
              </Button>
            </div>
          </>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle className="truncate">{item.name}</SheetTitle>
              <SheetDescription>{item.kind === "folder" ? "文件夹操作" : "文件操作"}</SheetDescription>
            </SheetHeader>
            <div className="space-y-0.5">
              <SheetRow onClick={() => setMode("rename")}>
                <Pencil />
                <span>重命名</span>
              </SheetRow>
              <SheetRow onClick={() => closeThen(() => onMove(item))}>
                <FolderInput />
                <span>移动</span>
              </SheetRow>
              <SheetRow onClick={() => closeThen(() => onSelect(item))}>
                <Rows3 />
                <span>选择</span>
              </SheetRow>
              {item.kind === "file" ? (
                <>
                  <SheetRow onClick={() => closeThen(() => onDownload(item))}>
                    <Download />
                    <span>下载</span>
                  </SheetRow>
                  <SheetRow onClick={() => closeThen(() => onShare(item))}>
                    <Link2 />
                    <span>复制分享链接</span>
                  </SheetRow>
                </>
              ) : null}
            </div>
            <SheetSeparator />
            <SheetRow
              className="text-[var(--danger-text)] [&>svg]:text-[var(--danger-text)] active:bg-[var(--danger-bg)] hover:bg-[var(--danger-bg)]"
              onClick={() => closeThen(() => onDelete(item))}
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

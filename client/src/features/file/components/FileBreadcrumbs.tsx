import type { FileBreadcrumb } from "@/api/file";
import {
  collectDroppedFiles,
  hasDraggedFiles,
} from "@/features/file/dropFiles";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { useState, type DragEvent } from "react";

interface FileBreadcrumbsProps {
  dragging: boolean;
  items: FileBreadcrumb[];
  onDropFiles: (files: File[], folderId: string | null, folderName: string) => void;
  onDropItems: (item: FileBreadcrumb, index: number) => void;
  onNavigate: (item: FileBreadcrumb, index: number) => void;
}

/** 超过该层级数时折叠中间路径 */
const MAX_VISIBLE_CRUMBS = 4;

export function FileBreadcrumbs({
  dragging,
  items,
  onDropFiles,
  onDropItems,
  onNavigate,
}: FileBreadcrumbsProps) {
  const [dropKey, setDropKey] = useState<string | null>(null);
  const shouldCollapse = items.length > MAX_VISIBLE_CRUMBS;
  const head = shouldCollapse ? items.slice(0, 1) : items;
  const hidden = shouldCollapse ? items.slice(1, items.length - 2) : [];
  const tail = shouldCollapse ? items.slice(items.length - 2) : [];
  const keyOf = (item: FileBreadcrumb) => String(item._id ?? "root");

  const dragOver = (item: FileBreadcrumb, event: DragEvent<HTMLButtonElement>) => {
    if (hasDraggedFiles(event.dataTransfer)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      setDropKey(`files-${keyOf(item)}`);
      return;
    }
    if (!dragging) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropKey(`move-${keyOf(item)}`);
  };

  const dragLeave = (item: FileBreadcrumb, event: DragEvent<HTMLButtonElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node)) return;
    setDropKey((current) =>
      current === `files-${keyOf(item)}` || current === `move-${keyOf(item)}`
        ? null
        : current,
    );
  };

  const drop = (
    item: FileBreadcrumb,
    index: number,
    event: DragEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    setDropKey(null);
    if (hasDraggedFiles(event.dataTransfer)) {
      void collectDroppedFiles(event.dataTransfer).then((files) => {
        if (files.length > 0) onDropFiles(files, item._id, item.name);
      });
      return;
    }
    if (dragging) onDropItems(item, index);
  };

  const renderCrumb = (item: FileBreadcrumb) => {
    const index = items.indexOf(item);
    const current = index === items.length - 1;
    const isDropTarget =
      dropKey === `files-${keyOf(item)}` || dropKey === `move-${keyOf(item)}`;
    return (
      <button
        aria-current={current ? "page" : undefined}
        className={`h-7 rounded-compact px-1.5 text-left transition-colors hover:bg-bg-hover hover:text-text-primary disabled:cursor-default disabled:text-text-primary${
          isDropTarget ? " bg-bg-selected text-text-primary" : ""
        }`}
        disabled={current}
        key={keyOf(item)}
        onClick={() => onNavigate(item, index)}
        onDragLeave={(event) => dragLeave(item, event)}
        onDragOver={(event) => dragOver(item, event)}
        onDrop={(event) => drop(item, index, event)}
        type="button"
      >
        {item.name}
      </button>
    );
  };

  return (
    <nav
      aria-label="文件路径"
      className="flex min-w-0 items-center overflow-x-auto whitespace-nowrap text-[13px] text-text-muted scrollbar-none"
    >
      {head.map((item, index) => (
        <div className="flex shrink-0 items-center" key={keyOf(item)}>
          {index > 0 ? (
            <ChevronRight aria-hidden className="size-4 text-text-subtle" />
          ) : null}
          {renderCrumb(item)}
        </div>
      ))}
      {hidden.length > 0 ? (
        <div className="flex shrink-0 items-center">
          <ChevronRight aria-hidden className="size-4 text-text-subtle" />
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger render={
            <button
              aria-label="展开隐藏路径"
              className="grid h-7 w-6 place-items-center rounded-compact hover:bg-bg-hover hover:text-text-primary"
              type="button"
            >
              <MoreHorizontal className="size-4" />
            </button>
            } />
            <DropdownMenuContent align="start" aria-label="隐藏路径">
              {hidden.map((item) => (
                <DropdownMenuItem
                  key={keyOf(item)}
                  onClick={() => onNavigate(item, items.indexOf(item))}
                >
                  {item.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}
      {tail.map((item) => (
        <div className="flex shrink-0 items-center" key={keyOf(item)}>
          <ChevronRight aria-hidden className="size-4 text-text-subtle" />
          {renderCrumb(item)}
        </div>
      ))}
    </nav>
  );
}

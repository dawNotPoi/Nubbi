import type { FileListItem } from "@/api/file";
import { collectDroppedFiles, hasDraggedFiles } from "@/features/file/dropFiles";
import type { FileSelectModifiers, FileSortMode } from "@/features/file/model";
import { ArrowDown, ArrowUp } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type ReactElement,
} from "react";
import { FileBatchBar } from "./FileBatchBar";
import { FileListSkeleton } from "./FileListSkeleton";
import { FileRow } from "./FileRow";
import { FileUploadButton } from "./FileUploadButton";

interface FileListProps {
  draggingItems: FileListItem[] | null;
  editingId: string | null;
  emptyDescription: string;
  error: boolean;
  folderId: string | null;
  folderName: string;
  hasFilters: boolean;
  items: FileListItem[];
  loading: boolean;
  pending: boolean;
  query: string;
  selectedIds: string[];
  sortMode: FileSortMode;
  onCancelRename: () => void;
  onClearFilters: () => void;
  onClearSelection: () => void;
  onCreate: () => void;
  onDelete: (item: FileListItem) => void;
  onDeleteSelected: () => void;
  onDownload: (item: FileListItem) => void;
  onDropFiles: (files: File[], folderId: string | null, folderName: string) => void;
  onDropItems: (targetFolderId: string) => void;
  onEndItemDrag: () => void;
  onMove: (item: FileListItem) => void;
  onMoveSelected: () => void;
  onOpen: (item: FileListItem) => void;
  onRename: (item: FileListItem, name: string) => Promise<boolean>;
  onRetry: () => void;
  onSelect: (id: string, modifiers: FileSelectModifiers) => void;
  onShare: (item: FileListItem) => void;
  onSortChange: (mode: FileSortMode) => void;
  onStartItemDrag: (items: FileListItem[]) => void;
  onToggle: (id: string, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
  onUpload: (files: File[]) => void;
}

/**
 * 展示文件列表并协调行级选择、键盘导航与拖拽。
 * @param props 列表数据、状态及业务操作回调。
 * @returns 文件列表界面。
 */
export function FileList(props: FileListProps): ReactElement {
  const [activeIndex, setActiveIndex] = useState(-1);
  const [moveDropTargetId, setMoveDropTargetId] = useState<string | null>(null);
  const [fileDropTargetId, setFileDropTargetId] = useState<string | null>(null);
  const [uploadHover, setUploadHover] = useState(false);
  const rowRefs = useRef<Array<HTMLLIElement | null>>([]);
  const allSelected =
    props.items.length > 0 && props.selectedIds.length === props.items.length;
  const partial = props.selectedIds.length > 0 && !allSelected;
  const selectedItems = useMemo(
    () => props.items.filter((item) => props.selectedIds.includes(item._id)),
    [props.items, props.selectedIds],
  );
  const nameSorted = props.sortMode.startsWith("name");
  const updatedSorted = props.sortMode.startsWith("updated");

  useEffect(() => {
    setActiveIndex((current) =>
      current >= props.items.length ? props.items.length - 1 : current,
    );
  }, [props.items.length]);

  /** 把键盘焦点移动到指定行，越界时收敛到列表范围内 */
  const focusRow = (index: number) => {
    const count = props.items.length;
    if (count === 0) return;
    const clamped = Math.max(0, Math.min(index, count - 1));
    setActiveIndex(clamped);
    rowRefs.current[clamped]?.focus();
  };

  /**
   * 行和文件名使用列表快捷键，独立控件与浮层保留自己的键盘语义。
   * @param event 列表接收的键盘事件。
   * @returns 无返回值。
   */
  const handleKeyDown = (event: KeyboardEvent<HTMLUListElement>): void => {
    const target = event.target as HTMLElement;
    if (
      props.pending || event.defaultPrevented || event.nativeEvent.isComposing ||
      !event.currentTarget.contains(target) ||
      target.closest(
        "input, textarea, select, [contenteditable]:not([contenteditable='false']), " +
        "button:not([data-file-row-name]), a, [role='menu'], [role='menuitem']",
      )
    ) return;
    const count = props.items.length;
    if (count === 0) return;
    const active = activeIndex >= 0 && activeIndex < count ? activeIndex : -1;
    const current = active >= 0 ? active : 0;
    const moveTo = (index: number) => {
      const clamped = Math.max(0, Math.min(index, count - 1));
      focusRow(clamped);
      props.onSelect(
        props.items[clamped]._id,
        event.shiftKey ? { shiftKey: true } : {},
      );
    };

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
      event.preventDefault();
      props.onToggleAll(true);
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        moveTo(active + 1);
        return;
      case "ArrowUp":
        event.preventDefault();
        moveTo(active - 1);
        return;
      case "Home":
        event.preventDefault();
        moveTo(0);
        return;
      case "End":
        event.preventDefault();
        moveTo(count - 1);
        return;
      case "Enter":
        event.preventDefault();
        props.onOpen(props.items[current]);
        return;
      case " ":
        event.preventDefault();
        props.onToggle(
          props.items[current]._id,
          !props.selectedIds.includes(props.items[current]._id),
        );
        return;
      case "Delete":
      case "Backspace":
        event.preventDefault();
        if (props.selectedIds.length > 0) props.onDeleteSelected();
        else props.onDelete(props.items[current]);
        return;
      case "Escape":
        props.onClearSelection();
        return;
      default:
        return;
    }
  };

  /** 开始拖拽行：选中行整体拖拽，未选中行只拖拽当前行 */
  const startDrag = (item: FileListItem, event: DragEvent<HTMLLIElement>) => {
    if (
      (event.target as HTMLElement).closest(
        "input,label,.file-row-actions,a",
      )
    ) {
      event.preventDefault();
      return;
    }
    const dragList = props.selectedIds.includes(item._id) ? selectedItems : [item];
    if (dragList.length === 0) return;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(
      "text/plain",
      dragList.map((target) => target.name).join("\n"),
    );
    props.onStartItemDrag(dragList);
  };

  /** 拖动经过文件夹行：区分移动拖拽与文件上传拖拽并高亮目标 */
  const dragOverRow = (item: FileListItem, event: DragEvent<HTMLLIElement>) => {
    if (item.kind !== "folder") return;
    if (hasDraggedFiles(event.dataTransfer)) {
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "copy";
      setFileDropTargetId(item._id);
      setMoveDropTargetId(null);
      return;
    }
    const dragItems = props.draggingItems;
    if (!dragItems || dragItems.some((target) => target._id === item._id)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    setMoveDropTargetId(item._id);
    setFileDropTargetId(null);
  };

  const dragLeaveRow = (item: FileListItem, event: DragEvent<HTMLLIElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node)) return;
    if (moveDropTargetId === item._id) setMoveDropTargetId(null);
    if (fileDropTargetId === item._id) setFileDropTargetId(null);
  };

  /** 在文件夹行上松开：文件走上传，选中行走进度移动 */
  const dropRow = (item: FileListItem, event: DragEvent<HTMLLIElement>) => {
    if (item.kind !== "folder") return;
    event.preventDefault();
    event.stopPropagation();
    setMoveDropTargetId(null);
    setFileDropTargetId(null);
    if (hasDraggedFiles(event.dataTransfer)) {
      void collectDroppedFiles(event.dataTransfer).then((files) => {
        if (files.length > 0) props.onDropFiles(files, item._id, item.name);
      });
      return;
    }
    if (props.draggingItems && props.draggingItems.length > 0) {
      props.onDropItems(item._id);
    }
  };

  /** 拖拽文件进入列表时高亮上传区域 */
  const sectionDragOver = (event: DragEvent<HTMLElement>) => {
    if (!hasDraggedFiles(event.dataTransfer)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setUploadHover(true);
  };

  const sectionDragLeave = (event: DragEvent<HTMLElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node)) return;
    setUploadHover(false);
  };

  const sectionDrop = (event: DragEvent<HTMLElement>) => {
    if (!hasDraggedFiles(event.dataTransfer)) return;
    event.preventDefault();
    setUploadHover(false);
    void collectDroppedFiles(event.dataTransfer).then((files) => {
      if (files.length > 0) props.onDropFiles(files, props.folderId, props.folderName);
    });
  };

  /** 点击列头切换该列的升序/降序 */
  const toggleSort = (column: "name" | "updated") => {
    if (column === "name") {
      props.onSortChange(props.sortMode === "name-asc" ? "name-desc" : "name-asc");
      return;
    }
    props.onSortChange(
      props.sortMode === "updated-desc" ? "updated-asc" : "updated-desc",
    );
  };

  return (
    <section
      aria-label="文件列表"
      className="relative"
      onDragLeave={sectionDragLeave}
      onDragOver={sectionDragOver}
      onDrop={sectionDrop}
    >
      <fieldset
        aria-busy={props.pending}
        className={`m-0 min-w-0 border-0 p-0 transition-opacity${props.pending ? " pointer-events-none opacity-60" : ""}`}
        disabled={props.pending}
      >
      <div className={`file-list-grid file-list-head${props.selectedIds.length ? " is-selecting" : ""}`}>
        <label className="file-check-cell">
          <span className="sr-only">全选当前页</span>
          <input
            checked={allSelected}
            className="file-checkbox"
            onChange={(event) => props.onToggleAll(event.target.checked)}
            ref={(node) => { if (node) node.indeterminate = partial; }}
            type="checkbox"
          />
        </label>
        {props.selectedIds.length > 0 ? (
          <div className="col-span-4">
            <FileBatchBar
              count={props.selectedIds.length}
              onCancel={props.onClearSelection}
              onDelete={props.onDeleteSelected}
              onMove={props.onMoveSelected}
            />
          </div>
        ) : (
          <>
            <button
              className="file-head-sort"
              onClick={() => toggleSort("name")}
              type="button"
            >
              文件名
              {nameSorted ? (
                props.sortMode === "name-asc"
                  ? <ArrowUp className="size-3" />
                  : <ArrowDown className="size-3" />
              ) : null}
            </button>
            <button
              className="file-head-sort file-head-meta"
              onClick={() => toggleSort("updated")}
              type="button"
            >
              最近修改
              {updatedSorted ? (
                props.sortMode === "updated-desc"
                  ? <ArrowDown className="size-3" />
                  : <ArrowUp className="size-3" />
              ) : null}
            </button>
            <span className="file-head-meta">类型 / 大小</span>
            <span />
          </>
        )}
      </div>

      {props.loading && props.items.length === 0 ? <FileListSkeleton /> : null}
      {props.error ? (
        <div className="file-state">
          <p>文件列表加载失败</p>
          <button className="file-state-button" onClick={props.onRetry} type="button">
            重新加载
          </button>
        </div>
      ) : null}
      {!props.loading && !props.error && props.items.length === 0 ? (
        <div className="file-state">
          <p>{props.emptyDescription}</p>
          {props.hasFilters ? (
            <button
              className="file-state-button"
              onClick={props.onClearFilters}
              type="button"
            >
              清除筛选
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <FileUploadButton
                className="file-state-button"
                label="上传文件"
                onSelect={props.onUpload}
              />
              <button
                className="file-state-button"
                onClick={props.onCreate}
                type="button"
              >
                新建文件夹
              </button>
            </div>
          )}
        </div>
      ) : null}
      {!props.error && props.items.length > 0 ? (
        <ul
          aria-label="文件列表内容"
          className="m-0 list-none p-0 focus-visible:outline-none"
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          {props.items.map((item, index) => (
            <FileRow
              dragging={Boolean(
                props.draggingItems?.some((target) => target._id === item._id),
              )}
              editing={props.editingId === item._id}
              fileDropTarget={fileDropTargetId === item._id}
              index={index}
              item={item}
              key={`${item.kind}-${item._id}`}
              moveDropTarget={moveDropTargetId === item._id}
              query={props.query}
              rowRef={(node) => {
                rowRefs.current[index] = node;
              }}
              selected={props.selectedIds.includes(item._id)}
              onCancelRename={props.onCancelRename}
              onDelete={props.onDelete}
              onDownload={props.onDownload}
              onMove={props.onMove}
              onOpen={props.onOpen}
              onRename={props.onRename}
              onRowDragEnd={props.onEndItemDrag}
              onRowDragLeave={(event) => dragLeaveRow(item, event)}
              onRowDragOver={(event) => dragOverRow(item, event)}
              onRowDragStart={(event) => startDrag(item, event)}
              onRowDrop={(event) => dropRow(item, event)}
              onRowFocus={setActiveIndex}
              onSelect={props.onSelect}
              onShare={props.onShare}
              onToggle={props.onToggle}
            />
          ))}
        </ul>
      ) : null}
      </fieldset>
      {uploadHover ? (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-md border-2 border-dashed border-accent-border bg-accent-bg/80 text-sm font-medium text-accent-text">
          松开后上传到「{props.folderName}」
        </div>
      ) : null}
    </section>
  );
}

import type { FileListItem } from "@/api/file";
import { FileBatchBar } from "./FileBatchBar";
import { FileListSkeleton } from "./FileListSkeleton";
import { FileRow } from "./FileRow";

interface FileListProps {
  editingId: string | null;
  emptyDescription: string;
  error: boolean;
  items: FileListItem[];
  loading: boolean;
  pending: boolean;
  selectedIds: string[];
  onCancelRename: () => void;
  onClearSelection: () => void;
  onCreate: () => void;
  onDelete: (item: FileListItem) => void;
  onDeleteSelected: () => void;
  onDownload: (item: FileListItem) => void;
  onMove: (item: FileListItem) => void;
  onMoveSelected: () => void;
  onOpen: (item: FileListItem) => void;
  onRename: (item: FileListItem, name: string) => Promise<boolean>;
  onRetry: () => void;
  onSelectOnly: (id: string) => void;
  onShare: (item: FileListItem) => void;
  onStartRename: (item: FileListItem) => void;
  onToggle: (id: string, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
}

export function FileList(props: FileListProps) {
  const allSelected =
    props.items.length > 0 && props.selectedIds.length === props.items.length;
  const partial = props.selectedIds.length > 0 && !allSelected;

  return (
    <section aria-label="文件列表">
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
            <span>文件名</span>
            <span className="file-head-meta">最近修改</span>
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
          <button className="file-state-button" onClick={props.onCreate} type="button">
            新建文件夹
          </button>
        </div>
      ) : null}
      {!props.error && props.items.length > 0 ? (
        <ul className="m-0 list-none p-0">
          {props.items.map((item) => (
            <FileRow
              editing={props.editingId === item._id}
              item={item}
              key={`${item.kind}-${item._id}`}
              selected={props.selectedIds.includes(item._id)}
              onCancelRename={props.onCancelRename}
              onDelete={props.onDelete}
              onDownload={props.onDownload}
              onMove={props.onMove}
              onOpen={props.onOpen}
              onRename={props.onRename}
              onSelectOnly={props.onSelectOnly}
              onShare={props.onShare}
              onStartRename={props.onStartRename}
              onToggle={props.onToggle}
            />
          ))}
        </ul>
      ) : null}
      </fieldset>
    </section>
  );
}

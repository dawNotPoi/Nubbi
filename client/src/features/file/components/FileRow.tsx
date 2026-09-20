import type { FileListItem } from "@/api/file";
import {
  formatFileDate,
  formatFileFullDate,
  getFileMobileMeta,
  getFileTypeAndSize,
  splitFileName,
  type FileSelectModifiers,
} from "@/features/file/model";
import {
  File,
  FileArchive,
  FileCode,
  FileImage,
  FileText,
  FileVideo,
  Folder,
  Music,
} from "lucide-react";
import { Dropdown } from "antd";
import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { buildFileRowMenuItems } from "./fileRowMenu";
import { FileRowActions } from "./FileRowActions";

/**
 * 根据文件类型返回对应的 lucide 图标组件。
 * 文件夹返回 Folder；文件按 MIME 类型和扩展名匹配不同图标。
 * @param item 文件或文件夹条目。
 * @returns lucide-react 图标组件类型。
 */
const getFileIcon = (item: FileListItem) => {
  if (item.kind === "folder") return Folder;
  const mime = item.mimeType ?? "";
  const ext = item.extension ?? "";
  const codeExts = new Set([
    "js", "ts", "jsx", "tsx", "py", "rb", "go", "rs", "java", "c", "cpp",
    "h", "cs", "swift", "kt", "scala", "php", "lua", "r", "sh", "bash",
    "yml", "yaml", "toml", "json", "xml", "html", "css", "scss", "less",
    "sql", "graphql", "md", "mdx", "vue", "svelte",
  ]);
  if (mime.startsWith("image/")) return FileImage;
  if (mime.startsWith("video/")) return FileVideo;
  if (mime.startsWith("audio/")) return Music;
  if (mime === "application/pdf") return FileText;
  if (
    mime.startsWith("text/") ||
    mime === "application/msword" ||
    mime.includes("wordprocessing") ||
    mime.includes("presentation") ||
    mime.includes("spreadsheet")
  )
    return FileText;
  if (
    mime.includes("zip") ||
    mime.includes("rar") ||
    mime.includes("7z") ||
    mime.includes("tar") ||
    mime.includes("gz") ||
    mime.includes("archive")
  )
    return FileArchive;
  if (codeExts.has(ext.toLowerCase())) return FileCode;
  return File;
};

/**
 * 文件类型色只表达对象身份，不承担选中、悬停或危险状态。
 */
const getFileIconColor = (item: FileListItem) => {
  if (item.kind === "folder") return "text-[var(--entity-folder)]";
  const mime = item.mimeType ?? "";
  if (mime.startsWith("image/")) return "text-[var(--file-image)]";
  if (mime.startsWith("video/")) return "text-[var(--file-video)]";
  if (mime.startsWith("audio/")) return "text-[var(--file-audio)]";
  return "text-[var(--entity-file)]";
};

/**
 * 高亮文件名中命中搜索关键词的片段。
 * @param text 待渲染的完整文本。
 * @param query 当前搜索词，为空时直接返回原文。
 * @returns 带高亮标记的 React 节点。
 */
const highlightText = (text: string, query: string): ReactNode => {
  const keyword = query.trim();
  if (!keyword) return text;
  const lowerText = text.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();
  const parts: ReactNode[] = [];
  let cursor = 0;
  let matchIndex = lowerText.indexOf(lowerKeyword);
  while (matchIndex >= 0) {
    if (matchIndex > cursor) parts.push(text.slice(cursor, matchIndex));
    parts.push(
      <mark
        className="rounded-sm bg-[var(--status-inbox-bg)] px-px text-inherit"
        key={`${matchIndex}-${keyword}`}
      >
        {text.slice(matchIndex, matchIndex + keyword.length)}
      </mark>,
    );
    cursor = matchIndex + keyword.length;
    matchIndex = lowerText.indexOf(lowerKeyword, cursor);
  }
  if (parts.length === 0) return text;
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
};

const COMPACT_FILE_QUERY = "(max-width: 820px)";

const getCompactMatches = () =>
  typeof window !== "undefined" && window.matchMedia(COMPACT_FILE_QUERY).matches;

const useCompactFileLayout = () => {
  const [compact, setCompact] = useState(getCompactMatches);

  useEffect(() => {
    const media = window.matchMedia(COMPACT_FILE_QUERY);
    const update = () => setCompact(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return compact;
};

interface FileRowProps {
  dragging: boolean;
  editing: boolean;
  fileDropTarget: boolean;
  index: number;
  item: FileListItem;
  moveDropTarget: boolean;
  query: string;
  rowRef: (node: HTMLLIElement | null) => void;
  selected: boolean;
  onCancelRename: () => void;
  onDelete: (item: FileListItem) => void;
  onDownload: (item: FileListItem) => void;
  onMove: (item: FileListItem) => void;
  onOpen: (item: FileListItem) => void;
  onRename: (item: FileListItem, name: string) => Promise<boolean>;
  onRowDragEnd: () => void;
  onRowDragLeave: (event: DragEvent<HTMLLIElement>) => void;
  onRowDragOver: (event: DragEvent<HTMLLIElement>) => void;
  onRowDragStart: (event: DragEvent<HTMLLIElement>) => void;
  onRowDrop: (event: DragEvent<HTMLLIElement>) => void;
  onRowFocus: (index: number) => void;
  onSelect: (id: string, modifiers: FileSelectModifiers) => void;
  onShare: (item: FileListItem) => void;
  onToggle: (id: string, checked: boolean) => void;
}

/**
 * 展示文件条目，文件名参与列表导航，操作区保留独立控件语义。
 * @param props 条目状态和行级操作回调。
 * @returns 文件或文件夹列表行。
 */
export function FileRow(props: FileRowProps): ReactElement {
  const [name, setName] = useState(props.item.name);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipBlurRef = useRef(false);
  const compact = useCompactFileLayout();
  const actions = {
    onDelete: props.onDelete,
    onDownload: props.onDownload,
    onMove: props.onMove,
    onOpen: props.onOpen,
    onShare: props.onShare,
  };
  const { base, extension } = splitFileName(props.item.name);
  const fullDate = formatFileFullDate(props.item.updatedAt);

  useEffect(() => {
    if (!props.editing) return;
    skipBlurRef.current = false;
    setName(props.item.name);
    requestAnimationFrame(() => inputRef.current?.select());
  }, [props.editing, props.item.name]);

  const submit = async () => {
    if (saving) return;
    const nextName = name.trim();
    if (!nextName || nextName === props.item.name) {
      props.onCancelRename();
      return;
    }
    setSaving(true);
    const saved = await props.onRename(props.item, nextName);
    setSaving(false);
    if (saved) props.onCancelRename();
  };

  const open = () => props.onOpen(props.item);
  const stopForControls = (event: MouseEvent<HTMLLIElement>) =>
    Boolean((event.target as HTMLElement).closest("button,input,label,a"));

  return (
    <Dropdown
      menu={{
        items: buildFileRowMenuItems(props.item, actions),
      }}
      trigger={["contextMenu"]}
    >
      <li
        className={`file-list-grid file-row${props.selected ? " is-selected" : ""}${
          props.dragging ? " is-dragging" : ""
        }${props.moveDropTarget ? " is-drop-target" : ""}${
          props.fileDropTarget ? " is-file-drop-target" : ""
        }`}
        draggable={!props.editing}
        onClick={(event) => {
          if (stopForControls(event)) return;
          if (compact) {
            open();
            return;
          }
          props.onSelect(props.item._id, {
            shiftKey: event.shiftKey,
            toggleKey: event.metaKey || event.ctrlKey,
          });
        }}
        onContextMenu={() => {
          if (!props.selected) props.onSelect(props.item._id, {});
        }}
        onDoubleClick={(event) => {
          if (stopForControls(event)) return;
          if (!compact) open();
        }}
        onDragEnd={props.onRowDragEnd}
        onDragLeave={props.onRowDragLeave}
        onDragOver={props.onRowDragOver}
        onDragStart={props.onRowDragStart}
        onDrop={props.onRowDrop}
        onFocus={() => props.onRowFocus(props.index)}
        ref={props.rowRef}
        tabIndex={-1}
      >
        <label className="file-check-cell file-row-check">
          <span className="sr-only">选择 {props.item.name}</span>
          <input
            checked={props.selected}
            className="file-checkbox"
            onChange={(event) => props.onToggle(props.item._id, event.target.checked)}
            type="checkbox"
          />
        </label>
        <div className="min-w-0 pr-4">
          <div className="flex items-center gap-2.5">
            {(() => {
              const Icon = getFileIcon(props.item);
              const iconColor = getFileIconColor(props.item);
              return <Icon className={`size-5 shrink-0 ${iconColor}`} />;
            })()}
            {props.editing ? (
              <input
                aria-label="重命名"
                className="h-8 w-full max-w-[360px] rounded border border-border-button bg-white px-2 text-sm outline-none focus:border-border-button-hover focus:ring-2 focus:ring-focus-ring"
                disabled={saving}
                onBlur={() => {
                  if (skipBlurRef.current) { skipBlurRef.current = false; return; }
                  void submit();
                }}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") { event.preventDefault(); void submit(); }
                  if (event.key === "Escape") {
                    skipBlurRef.current = true;
                    props.onCancelRename();
                  }
                }}
                onClick={(event) => event.stopPropagation()}
                ref={inputRef}
                value={name}
              />
            ) : (
              <button
                className="flex min-w-0 rounded px-1 py-0.5 text-left text-sm font-medium hover:bg-bg-hover"
                data-file-row-name
                onClick={(event) =>
                  compact
                    ? open()
                    : props.onSelect(props.item._id, {
                        shiftKey: event.shiftKey,
                        toggleKey: event.metaKey || event.ctrlKey,
                      })
                }
                onDoubleClick={(event) => {
                  event.stopPropagation();
                  if (!compact) open();
                }}
                title={props.item.name}
                type="button"
              >
                <span className="truncate">{highlightText(base, props.query)}</span>
                {extension ? (
                  <span className="shrink-0 text-text-muted">
                    .{highlightText(extension, props.query)}
                  </span>
                ) : null}
              </button>
            )}
          </div>
          <span className="file-mobile-meta">{getFileMobileMeta(props.item)}</span>
        </div>
        <span className="file-meta tabular-nums" title={fullDate}>
          {formatFileDate(props.item.updatedAt)}
        </span>
        <span className="file-meta tabular-nums">{getFileTypeAndSize(props.item)}</span>
        <FileRowActions item={props.item} {...actions} />
      </li>
    </Dropdown>
  );
}

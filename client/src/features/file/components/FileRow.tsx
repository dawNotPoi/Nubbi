import type { FileListItem } from "@/api/file";
import {
  formatFileDate,
  getFileMobileMeta,
  getFileTypeAndSize,
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
import {
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { FileRowActions } from "./FileRowActions";

/**
 * 根据文件类型返回对应的 lucide 图标组件。
 * 文件夹返回 Folder；文件按 MIME 类型和扩展名匹配不同图标。
 * @param item 文件或文件夹条目。
 * @returns lucide-react 图标组件类型。
 */
const getFileIcon = (item: FileListItem) => {
  if (item.kind === "folder") return Folder;
  const mime = (item as { mimeType?: string }).mimeType ?? "";
  const ext = (item as { extension?: string }).extension ?? "";
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
 * 根据文件类型返回图标颜色类名，用于快速视觉区分。
 * 文件夹用 amber，图片用 emerald，视频用 purple，音频用 pink，其余用 subtle。
 * @param item 文件或文件夹条目。
 * @returns Tailwind 文字颜色类名。
 */
const getFileIconColor = (item: FileListItem) => {
  if (item.kind === "folder") return "text-amber-500";
  const mime = (item as { mimeType?: string }).mimeType ?? "";
  if (mime.startsWith("image/")) return "text-emerald-500";
  if (mime.startsWith("video/")) return "text-purple-500";
  if (mime.startsWith("audio/")) return "text-pink-500";
  return "text-text-subtle";
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
  editing: boolean;
  item: FileListItem;
  selected: boolean;
  onCancelRename: () => void;
  onDelete: (item: FileListItem) => void;
  onDownload: (item: FileListItem) => void;
  onMove: (item: FileListItem) => void;
  onOpen: (item: FileListItem) => void;
  onRename: (item: FileListItem, name: string) => Promise<boolean>;
  onSelectOnly: (id: string) => void;
  onShare: (item: FileListItem) => void;
  onToggle: (id: string, checked: boolean) => void;
}

export function FileRow(props: FileRowProps): ReactElement {
  const [name, setName] = useState(props.item.name);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipBlurRef = useRef(false);
  const compact = useCompactFileLayout();

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
  return (
    <li
      className={`file-list-grid file-row${props.selected ? " is-selected" : ""}`}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("button,input,label")) return;
        if (compact) open();
        else props.onSelectOnly(props.item._id);
      }}
      onDoubleClick={(event) => {
        if ((event.target as HTMLElement).closest("button,input,label")) return;
        if (!compact) open();
      }}
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
              className="block max-w-full truncate rounded px-1 py-0.5 text-left text-sm font-medium hover:bg-bg-hover"
            onClick={() => compact ? open() : props.onSelectOnly(props.item._id)}
            onDoubleClick={(event) => {
              event.stopPropagation();
              if (!compact) open();
            }}
            title={props.item.name}
            type="button"
          >
            {props.item.name}
            </button>
          )}
        </div>
        <span className="file-mobile-meta">{getFileMobileMeta(props.item)}</span>
      </div>
      <span className="file-meta">{formatFileDate(props.item.updatedAt)}</span>
      <span className="file-meta">{getFileTypeAndSize(props.item)}</span>
      <FileRowActions
        item={props.item}
        onDelete={props.onDelete}
        onDownload={props.onDownload}
        onMove={props.onMove}
        onOpen={props.onOpen}
        onShare={props.onShare}
      />
    </li>
  );
}

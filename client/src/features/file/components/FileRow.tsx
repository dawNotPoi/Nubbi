import type { FileListItem } from "@/api/file";
import {
  formatFileDate,
  getFileMobileMeta,
  getFileTypeAndSize,
} from "@/features/file/model";
import { useEffect, useRef, useState } from "react";
import { FileRowActions } from "./FileRowActions";

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
  onStartRename: (item: FileListItem) => void;
  onToggle: (id: string, checked: boolean) => void;
}

export function FileRow(props: FileRowProps) {
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
        onRename={props.onStartRename}
        onShare={props.onShare}
      />
    </li>
  );
}

import { searchNotes, type Note, type SearchNote } from "@/api/note";
import clsx from "clsx";
import { LoaderCircle, Search } from "lucide-react";
import type { MouseEventHandler } from "react";
import { useEffect, useMemo, useState } from "react";
import { NoteTargetPickerRow } from "./NoteTargetPickerRow";

const DEFAULT_LIMIT = 10;
const SEARCH_DELAY = 220;

type NoteTarget = Note | SearchNote;

export type NoteTargetPickerPanelProps = {
  autoFocus?: boolean;
  blockedIds?: Set<string>;
  className?: string;
  disabled?: boolean;
  emptyMessage?: string;
  maxTargets?: number;
  onCancel?: () => void;
  onMouseDown?: MouseEventHandler<HTMLDivElement>;
  onSelect: (note: Note) => void;
  placeholder?: string;
  recentLabel?: string;
  searchLabel?: string;
  selectedId?: string | null;
  targets: Note[];
};

export function NoteTargetPickerPanel({
  autoFocus = false,
  blockedIds = new Set<string>(),
  className,
  disabled = false,
  emptyMessage = "暂无可选择的位置",
  maxTargets = DEFAULT_LIMIT,
  onCancel,
  onMouseDown,
  onSelect,
  placeholder = "将页面移至...",
  recentLabel = "最近",
  searchLabel = "搜索结果",
  selectedId,
  targets,
}: NoteTargetPickerPanelProps) {
  const [searchValue, setSearchValue] = useState("");
  const [searchResults, setSearchResults] = useState<SearchNote[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const query = searchValue.trim();

  const recentTargets = useMemo(
    () =>
      targets
        .filter((note) => !blockedIds.has(note._id))
        .slice(0, maxTargets),
    [blockedIds, maxTargets, targets],
  );

  const resultTargets = useMemo(
    () => searchResults.filter((note) => !blockedIds.has(note._id)),
    [blockedIds, searchResults],
  );

  const visibleTargets: NoteTarget[] = query ? resultTargets : recentTargets;
  const sectionLabel = query ? searchLabel : recentLabel;
  const visibleEmptyMessage = query ? "没有匹配的页面" : emptyMessage;

  useEffect(() => {
    const nextQuery = searchValue.trim();
    if (!nextQuery) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    setSearchResults([]);
    const timer = window.setTimeout(() => {
      searchNotes(nextQuery)
        .then((response) => {
          if (!cancelled) {
            setSearchResults(response.data || []);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setSearchResults([]);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsSearching(false);
          }
        });
    }, SEARCH_DELAY);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchValue]);

  const selectFirstTarget = () => {
    const firstTarget = visibleTargets[0];
    if (!firstTarget || disabled) return;
    onSelect(firstTarget);
  };

  const renderLoadingRows = () =>
    Array.from({ length: 6 }).map((_, index) => (
      <div
        className="flex h-9 animate-pulse items-center gap-2 rounded-md px-2"
        key={index}
      >
        <div className="size-4 rounded bg-[#e7e5e1]" />
        <div className="h-3 w-36 rounded bg-[#e7e5e1]" />
      </div>
    ));

  return (
    <div
      className={clsx("flex flex-col overflow-hidden bg-white text-[#37352f]", className)}
      onMouseDown={onMouseDown}
      role="dialog"
    >
      <div className="px-3 pb-2 pt-3">
        <div
          className={clsx(
            "flex h-9 items-center gap-2 rounded-lg border border-[#2383e2] bg-white px-2.5",
            "shadow-[0_0_0_2px_rgba(35,131,226,0.16)]",
          )}
        >
          <Search className="size-4 shrink-0 text-[#9b9a97]" />
          <input
            autoFocus={autoFocus}
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-[#37352f] outline-none placeholder:text-[#b4b4b1]"
            onChange={(event) => setSearchValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                selectFirstTarget();
              }
              if (event.key === "Escape") {
                onCancel?.();
              }
            }}
            placeholder={placeholder}
            type="text"
            value={searchValue}
          />
          {isSearching || disabled ? (
            <LoaderCircle className="size-4 shrink-0 animate-spin text-[#9b9a97]" />
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <div className="px-1 pb-1.5 pt-3 text-xs text-[#787774]">
          {sectionLabel}
        </div>
        {isSearching ? (
          <div className="space-y-1">{renderLoadingRows()}</div>
        ) : visibleTargets.length > 0 ? (
          <div className="space-y-1">
            {visibleTargets.map((note) => (
              <NoteTargetPickerRow
                active={selectedId === note._id}
                disabled={disabled}
                key={note._id}
                note={note}
                onSelect={onSelect}
              />
            ))}
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center text-sm text-[#9b9a97]">
            {visibleEmptyMessage}
          </div>
        )}
      </div>
    </div>
  );
}

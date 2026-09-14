import { searchNotes, type Note, type SearchNote } from "@/api/note";
import clsx from "clsx";
import { LoaderCircle, Search } from "lucide-react";
import type { MouseEventHandler } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  buildTargetChildrenByParentId,
  getTopLevelTargetNotes,
  type NoteTarget,
} from "../model/targetPicker";
import { NoteTargetPickerLoadingRows } from "./NoteTargetPickerLoadingRows";
import { NoteTargetPickerTree } from "./NoteTargetPickerTree";

const DEFAULT_LIMIT = 10;
const SEARCH_DELAY = 220;

export type NoteTargetPickerPanelProps = {
  allNotes?: Note[];
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
  allNotes = [],
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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
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

  const sectionLabel = query ? searchLabel : recentLabel;
  const visibleEmptyMessage = query ? "没有匹配的页面" : emptyMessage;
  const visibleTargets: NoteTarget[] = query ? resultTargets : recentTargets;
  const hierarchyNotes = allNotes.length > 0 ? allNotes : targets;
  const childrenByParentId = useMemo(
    () => buildTargetChildrenByParentId(hierarchyNotes, blockedIds),
    [blockedIds, hierarchyNotes],
  );
  const topLevelTargets = useMemo(
    () => getTopLevelTargetNotes(visibleTargets, hierarchyNotes),
    [hierarchyNotes, visibleTargets],
  );

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

  const toggleExpanded = (noteId: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
      }
      return next;
    });
  };

  return (
    <div
      className={clsx("flex flex-col overflow-hidden bg-white text-text-primary", className)}
      onMouseDown={onMouseDown}
      role="dialog"
    >
      <div className="px-3 pb-2 pt-3">
        <div
          className={clsx(
            "flex h-9 items-center gap-2 rounded-lg border border-accent-border bg-white px-2.5",
            "shadow-focus-input",
          )}
        >
          <Search className="size-4 shrink-0 text-text-subtle" />
          <input
            autoFocus={autoFocus}
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-text-primary outline-none placeholder:text-text-placeholder"
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
            <LoaderCircle className="size-4 shrink-0 animate-spin text-text-subtle" />
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <div className="px-1 pb-1.5 pt-3 text-xs text-text-muted">
          {sectionLabel}
        </div>
        {isSearching ? (
          <NoteTargetPickerLoadingRows />
        ) : visibleTargets.length > 0 ? (
          <NoteTargetPickerTree
            childrenByParentId={childrenByParentId}
            disabled={disabled}
            expandedIds={expandedIds}
            notes={topLevelTargets}
            selectedId={selectedId}
            onSelect={onSelect}
            onToggle={toggleExpanded}
          />
        ) : (
          <div className="flex h-32 items-center justify-center text-sm text-text-subtle">
            {visibleEmptyMessage}
          </div>
        )}
      </div>
    </div>
  );
}

import type { Note } from "@/api/note";
import { Header } from "@/component/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mobileBottomNavHiddenAtom } from "@/store/atom/common";
import { sortLibraryNotes } from "@/features/note/model/library";
import { useNoteLibraryController } from "@/features/note/hooks/useNoteLibraryController";
import { useSetAtom } from "jotai";
import {
  ArrowLeft,
  FolderInput,
  ListFilter,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { MobileNoteFilterSheet } from "./MobileNoteFilterSheet";
import { MobileNoteRow } from "./MobileNoteRow";

type NoteLibraryController = ReturnType<typeof useNoteLibraryController>;

type MobileNoteLibraryProps = {
  library: NoteLibraryController;
};

const headerActionClass =
  "grid size-11 shrink-0 place-items-center rounded-[8px] text-text-subtle transition-colors active:bg-bg-selected focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring [&>svg]:size-5";

export function MobileNoteLibrary({ library }: MobileNoteLibraryProps) {
  const [tab, setTab] = useState<"recent" | "directory">("recent");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const setBottomNavHidden = useSetAtom(mobileBottomNavHiddenAtom);
  const searchMode = library.searchOpen || Boolean(library.filterText);

  useEffect(() => {
    setBottomNavHidden(searchMode || selecting);
    return () => setBottomNavHidden(false);
  }, [searchMode, selecting, setBottomNavHidden]);

  useEffect(() => {
    if (selecting && library.selectedNotes.length === 0) setSelecting(false);
  }, [library.selectedNotes.length, selecting]);

  const recentNotes = useMemo(() => {
    const filtered = library.recentNotes.filter((note) => {
      if (library.statusFilter !== "all" && note.status !== library.statusFilter) return false;
      if (library.publishedFilter === "published" && !note.published) return false;
      if (library.publishedFilter === "unpublished" && note.published) return false;
      if (
        library.tagsFilter.length > 0 &&
        !library.tagsFilter.some((tag) => note.tags.includes(tag))
      ) {
        return false;
      }
      return true;
    });
    return sortLibraryNotes(filtered, library.sortMode);
  }, [
    library.publishedFilter,
    library.recentNotes,
    library.sortMode,
    library.statusFilter,
    library.tagsFilter,
  ]);

  const activeFilterCount =
    Number(library.statusFilter !== "all") +
    Number(library.publishedFilter !== "all") +
    Number(library.tagsFilter.length > 0) +
    Number(library.sortMode !== "updated-desc");

  const enterSelection = (note: Note) => {
    setSelecting(true);
    if (!library.selectedIds.includes(note._id)) library.toggleSelected(true, note._id);
  };

  const leaveSelection = () => {
    setSelecting(false);
    library.clearSelection();
  };

  const revealFromSearch = (note: Note) => {
    library.revealInTree(note._id);
    setTab("directory");
  };

  const createAndOpen = async () => {
    const created = await library.createRootNote();
    if (created) library.openNote(created);
  };

  const renderRow = (
    note: Note,
    options: {
      depth?: number;
      expanded?: boolean;
      canExpand?: boolean;
      pathLabel?: string;
      allowReveal?: boolean;
    } = {},
  ) => (
    <MobileNoteRow
      key={note._id}
      note={note}
      depth={options.depth}
      expanded={options.expanded}
      canExpand={options.canExpand}
      pathLabel={options.pathLabel}
      selecting={selecting}
      selected={library.selectedIds.includes(note._id)}
      onDelete={(target) => library.confirmDelete([target])}
      onEnterSelection={enterSelection}
      onMove={(target) => library.openMoveModal([target])}
      onOpen={library.openNote}
      onRename={library.renameNote}
      onReveal={options.allowReveal ? revealFromSearch : undefined}
      onToggleExpand={library.toggleLibraryNodeExpanded}
      onToggleSelection={(target, selected) => library.toggleSelected(selected, target._id)}
    />
  );

  if (selecting) {
    return (
      <div className="min-h-full bg-surface">
        <Header className="border-b border-border-row bg-surface/96">
          <div className="flex h-full items-center justify-between">
            <button
              className="min-h-11 rounded-[8px] px-2 text-[15px] text-text-muted active:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              onClick={leaveSelection}
              type="button"
            >
              取消
            </button>
            <div className="text-[15px] font-medium text-text-primary">已选择 {library.selectedNotes.length} 项</div>
            <div className="w-[52px]" aria-hidden="true" />
          </div>
        </Header>

        <ul className="px-3">
          {(tab === "recent" ? recentNotes : library.libraryRows.map((row) => row.note)).map((note) =>
            renderRow(note),
          )}
        </ul>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border-row bg-surface/98 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-lg">
          <div className="mx-auto grid max-w-sm grid-cols-2 gap-2">
            <Button
              className="h-11 rounded-[8px]"
              disabled={library.selectedNotes.length === 0}
              icon={<FolderInput />}
              variant="outline"
              onClick={() => {
                setSelecting(false);
                library.openMoveModal(library.selectedNotes);
              }}
            >
              移动
            </Button>
            <Button
              className="h-11 rounded-[8px] text-[var(--danger-text)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger-text)]"
              disabled={library.selectedNotes.length === 0}
              icon={<Trash2 />}
              variant="ghost"
              onClick={() => {
                setSelecting(false);
                library.confirmDelete(library.selectedNotes);
              }}
            >
              删除
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (searchMode) {
    return (
      <div className="min-h-full bg-surface">
        <Header className="border-b border-border-row bg-surface/98">
          <div className="flex h-full items-center gap-1.5">
            <button
              aria-label="退出搜索"
              className={headerActionClass}
              onClick={() => {
                library.setFilterText("");
                library.setSearchOpen(false);
              }}
              type="button"
            >
              <ArrowLeft />
            </button>
            <div className="relative min-w-0 flex-1">
              <Input
                autoFocus
                aria-label="搜索笔记"
                className="h-10 rounded-[8px] border-transparent bg-bg-hover px-3 pl-3 pr-10 text-[16px] focus-visible:bg-surface"
                placeholder="搜索笔记"
                value={library.filterText}
                onChange={(event) => library.setFilterText(event.target.value)}
              />
              {library.filterText ? (
                <button
                  aria-label="清除搜索"
                  className="absolute right-0 top-0 grid size-10 place-items-center rounded-[8px] text-text-subtle active:bg-bg-selected"
                  onClick={() => library.setFilterText("")}
                  type="button"
                >
                  <X className="size-[18px]" />
                </button>
              ) : null}
            </div>
          </div>
        </Header>

        <main className="px-3 py-2">
          <div className="px-2 py-2 text-[12px] font-medium text-text-muted">
            {library.filterText ? `搜索结果 · ${library.libraryRows.length}` : "输入关键词搜索全部笔记"}
          </div>
          {library.filterText && library.libraryRows.length > 0 ? (
            <ul>
              {library.libraryRows.map((row) =>
                renderRow(row.note, { pathLabel: row.pathLabel, allowReveal: true }),
              )}
            </ul>
          ) : library.filterText ? (
            <div className="py-20 text-center text-[14px] text-text-muted">没有匹配的笔记</div>
          ) : null}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-surface text-text-primary">
      <Header className="border-b border-border-row bg-surface/98">
        <div className="flex h-full items-center gap-1">
          <h1 className="min-w-0 flex-1 truncate text-[20px] font-semibold leading-7">笔记</h1>
          <button
            aria-label="搜索笔记"
            className={headerActionClass}
            onClick={() => library.setSearchOpen(true)}
            type="button"
          >
            <Search />
          </button>
          <button
            aria-label="筛选与排序"
            className={clsx(headerActionClass, "relative")}
            onClick={() => setFilterOpen(true)}
            type="button"
          >
            <ListFilter />
            {activeFilterCount > 0 ? (
              <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-[var(--brand)] px-1 text-[9px] font-semibold leading-4 text-white">
                {activeFilterCount}
              </span>
            ) : null}
          </button>
          <button
            aria-label="新建笔记"
            className={clsx(headerActionClass, "text-[var(--brand)]")}
            disabled={!library.owner}
            onClick={() => void createAndOpen()}
            type="button"
          >
            <Plus />
          </button>
        </div>
      </Header>

      <main className="px-3 pb-4 pt-2">
        <div className="mb-2 grid grid-cols-2 rounded-[8px] bg-bg-hover p-1">
          {(["recent", "directory"] as const).map((value) => (
            <button
              key={value}
              aria-pressed={tab === value}
              className={clsx(
                "h-9 rounded-[6px] text-[14px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring",
                tab === value
                  ? "bg-surface font-medium text-text-primary shadow-[0_1px_2px_rgba(55,53,47,0.08)]"
                  : "font-normal text-text-muted active:bg-bg-selected",
              )}
              onClick={() => setTab(value)}
              type="button"
            >
              {value === "recent" ? "最近" : "目录"}
            </button>
          ))}
        </div>

        {library.isLoading || !library.owner ? (
          <div className="space-y-1 py-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex min-h-[68px] items-center gap-3 border-b border-border-row px-2">
                <div className="size-9 animate-pulse rounded-[8px] bg-bg-hover" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/2 animate-pulse rounded bg-bg-hover" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-bg-hover" />
                </div>
              </div>
            ))}
          </div>
        ) : library.isError ? (
          <div className="grid min-h-[260px] place-items-center text-center">
            <div>
              <p className="text-[14px] text-text-muted">笔记加载失败</p>
              <Button className="mt-3 h-10 rounded-[8px]" variant="outline" onClick={() => void library.refetch()}>
                重试
              </Button>
            </div>
          </div>
        ) : tab === "recent" ? (
          recentNotes.length > 0 ? (
            <ul>{recentNotes.map((note) => renderRow(note))}</ul>
          ) : (
            <div className="grid min-h-[260px] place-items-center text-center text-[14px] text-text-muted">
              暂无最近笔记
            </div>
          )
        ) : library.libraryRows.length > 0 ? (
          <ul>
            {library.libraryRows.map((row) =>
              renderRow(row.note, {
                depth: row.depth,
                expanded: row.expanded,
                canExpand: row.hasChildren,
              }),
            )}
          </ul>
        ) : (
          <div className="grid min-h-[260px] place-items-center text-center text-[14px] text-text-muted">
            暂无笔记
          </div>
        )}
      </main>

      <MobileNoteFilterSheet
        availableTags={library.availableTags}
        open={filterOpen}
        publishedFilter={library.publishedFilter}
        sortMode={library.sortMode}
        statusFilter={library.statusFilter}
        tagsFilter={library.tagsFilter}
        onOpenChange={setFilterOpen}
        onPublishedFilterChange={library.setPublishedFilter}
        onSortModeChange={library.setSortMode}
        onStatusFilterChange={library.setStatusFilter}
        onTagsFilterChange={library.setTagsFilter}
      />
    </div>
  );
}

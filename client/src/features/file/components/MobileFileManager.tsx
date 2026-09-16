import type { FileListItem } from "@/api/file";
import { Header } from "@/component/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetRow,
  SheetTitle,
} from "@/components/ui/sheet";
import { FILE_PAGE_SIZE } from "@/features/file/model";
import { useFileManagerController } from "@/features/file/hooks/useFileManagerController";
import { mobileBottomNavHiddenAtom } from "@/store/atom/common";
import { useSetAtom } from "jotai";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FolderInput,
  FolderPlus,
  ListFilter,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { MobileFileFilterSheet } from "./MobileFileFilterSheet";
import { MobileFileRow } from "./MobileFileRow";

type FileManagerController = ReturnType<typeof useFileManagerController>;

type MobileFileManagerProps = {
  manager: FileManagerController;
};

const headerActionClass =
  "grid size-11 shrink-0 place-items-center rounded-[8px] text-text-subtle transition-colors active:bg-bg-selected focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring [&>svg]:size-5";

export function MobileFileManager({ manager }: MobileFileManagerProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchMode, setSearchMode] = useState(Boolean(manager.search));
  const [selecting, setSelecting] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const setBottomNavHidden = useSetAtom(mobileBottomNavHiddenAtom);

  useEffect(() => {
    setBottomNavHidden(searchMode || selecting);
    return () => setBottomNavHidden(false);
  }, [searchMode, selecting, setBottomNavHidden]);

  useEffect(() => {
    if (selecting && manager.selectedItems.length === 0) setSelecting(false);
  }, [manager.selectedItems.length, selecting]);

  const enterSelection = (item: FileListItem) => {
    setSelecting(true);
    if (!manager.selectedIds.includes(item._id)) manager.toggle(item._id, true);
  };

  const leaveSelection = () => {
    setSelecting(false);
    manager.clearSelection();
  };

  const activeFilterCount =
    Number(manager.category !== "all") + Number(manager.sortMode !== "updated-desc");
  const parentCrumbIndex = manager.breadcrumbs.length - 2;
  const canGoUp = parentCrumbIndex >= 0;
  const pageSize = manager.data?.limit ?? FILE_PAGE_SIZE;
  const pageNumber = Math.floor(manager.offset / pageSize) + 1;

  const handleUpload = (files: FileList | null) => {
    const nextFiles = Array.from(files ?? []);
    if (nextFiles.length > 0) manager.upload(nextFiles);
    if (uploadInputRef.current) uploadInputRef.current.value = "";
    setCreateOpen(false);
  };

  const renderRows = () => (
    <ul>
      {manager.items.map((item) => (
        <MobileFileRow
          key={item._id}
          editing={manager.editingId === item._id}
          item={item}
          selecting={selecting}
          selected={manager.selectedIds.includes(item._id)}
          onCancelRename={() => manager.setEditingId(null)}
          onDelete={manager.deleteOne}
          onDownload={(target) => void manager.download(target)}
          onEnterSelection={enterSelection}
          onMove={(target) => manager.openMove([target])}
          onOpen={manager.openItem}
          onRename={manager.rename}
          onShare={(target) => void manager.share(target)}
          onToggleSelection={(target, selected) => manager.toggle(target._id, selected)}
        />
      ))}
    </ul>
  );

  if (selecting) {
    return (
      <div className="min-h-full bg-surface">
        <Header className="border-b border-border-row bg-surface/98">
          <div className="flex h-full items-center justify-between">
            <button
              className="min-h-11 rounded-[8px] px-2 text-[15px] text-text-muted active:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              onClick={leaveSelection}
              type="button"
            >
              取消
            </button>
            <div className="text-[15px] font-medium text-text-primary">已选择 {manager.selectedItems.length} 项</div>
            <div className="w-[52px]" aria-hidden="true" />
          </div>
        </Header>
        <main className="px-3 pb-24 pt-2">{renderRows()}</main>
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border-row bg-surface/98 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-lg">
          <div className="mx-auto grid max-w-sm grid-cols-2 gap-2">
            <Button
              className="h-11 rounded-[8px]"
              disabled={manager.selectedItems.length === 0}
              icon={<FolderInput />}
              variant="outline"
              onClick={() => {
                setSelecting(false);
                manager.openMove(manager.selectedItems);
              }}
            >
              移动
            </Button>
            <Button
              className="h-11 rounded-[8px] text-[var(--danger-text)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger-text)]"
              disabled={manager.selectedItems.length === 0}
              icon={<Trash2 />}
              variant="ghost"
              onClick={() => {
                setSelecting(false);
                manager.deleteSelected();
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
                manager.setSearch("");
                setSearchMode(false);
              }}
              type="button"
            >
              <ArrowLeft />
            </button>
            <div className="relative min-w-0 flex-1">
              <Input
                autoFocus
                aria-label="搜索文件"
                className="h-10 rounded-[8px] border-transparent bg-bg-hover px-3 pl-3 pr-10 text-[16px] focus-visible:bg-surface"
                placeholder="搜索当前目录"
                value={manager.search}
                onChange={(event) => manager.setSearch(event.target.value)}
              />
              {manager.search ? (
                <button
                  aria-label="清除搜索"
                  className="absolute right-0 top-0 grid size-10 place-items-center rounded-[8px] text-text-subtle active:bg-bg-selected"
                  onClick={() => manager.setSearch("")}
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
            {manager.search ? `搜索结果 · ${manager.items.length}` : "输入关键词搜索当前目录"}
          </div>
          {manager.query.isLoading ? (
            <div className="space-y-1 py-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex min-h-[68px] items-center gap-3 border-b border-border-row px-2">
                  <div className="size-9 animate-pulse rounded-[8px] bg-bg-hover" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/2 animate-pulse rounded bg-bg-hover" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-bg-hover" />
                  </div>
                </div>
              ))}
            </div>
          ) : manager.items.length > 0 ? renderRows() : manager.search ? (
            <div className="py-20 text-center text-[14px] text-text-muted">没有匹配的文件</div>
          ) : null}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-surface text-text-primary">
      {manager.contextHolders}
      <input
        ref={uploadInputRef}
        className="hidden"
        multiple
        onChange={(event) => handleUpload(event.target.files)}
        type="file"
      />

      <Header className="border-b border-border-row bg-surface/98">
        <div className="flex h-full items-center gap-1">
          {canGoUp ? (
            <button
              aria-label="返回上级目录"
              className={headerActionClass}
              onClick={() => manager.navigateBreadcrumb(manager.breadcrumbs[parentCrumbIndex], parentCrumbIndex)}
              type="button"
            >
              <ArrowLeft />
            </button>
          ) : null}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[20px] font-semibold leading-7">{manager.currentFolderName}</h1>
            {manager.activeUploads > 0 ? (
              <button
                className="text-[11px] text-[var(--brand)]"
                onClick={() => manager.setUploadOpen(true)}
                type="button"
              >
                {manager.activeUploads} 个上传任务
              </button>
            ) : null}
          </div>
          <button
            aria-label="搜索文件"
            className={headerActionClass}
            onClick={() => setSearchMode(true)}
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
            aria-label="新建或上传"
            className={clsx(headerActionClass, "text-[var(--brand)]")}
            onClick={() => setCreateOpen(true)}
            type="button"
          >
            <Plus />
          </button>
        </div>
      </Header>

      <main className="px-3 pb-4 pt-2">
        {manager.query.isLoading ? (
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
        ) : manager.query.isError ? (
          <div className="grid min-h-[260px] place-items-center text-center">
            <div>
              <p className="text-[14px] text-text-muted">文件加载失败</p>
              <Button className="mt-3 h-10 rounded-[8px]" variant="outline" onClick={() => void manager.query.refetch()}>
                重试
              </Button>
            </div>
          </div>
        ) : manager.items.length > 0 ? (
          renderRows()
        ) : (
          <div className="grid min-h-[260px] place-items-center text-center">
            <div>
              <p className="text-[14px] text-text-muted">当前目录暂无文件</p>
              <Button className="mt-3 h-10 rounded-[8px]" variant="outline" onClick={() => setCreateOpen(true)}>
                新建或上传
              </Button>
            </div>
          </div>
        )}

        {(manager.offset > 0 || manager.data?.hasMore) && !manager.query.isLoading ? (
          <div className="mt-4 flex items-center justify-center gap-3 py-2">
            <button
              aria-label="上一页"
              className="grid size-10 place-items-center rounded-[8px] text-text-muted transition-colors active:bg-bg-selected disabled:opacity-35"
              disabled={manager.offset <= 0}
              onClick={() => manager.setOffset(Math.max(0, manager.offset - pageSize))}
              type="button"
            >
              <ChevronLeft className="size-[18px]" />
            </button>
            <span className="min-w-12 text-center text-[13px] text-text-muted">第 {pageNumber} 页</span>
            <button
              aria-label="下一页"
              className="grid size-10 place-items-center rounded-[8px] text-text-muted transition-colors active:bg-bg-selected disabled:opacity-35"
              disabled={!manager.data?.hasMore}
              onClick={() => manager.setOffset(manager.offset + pageSize)}
              type="button"
            >
              <ChevronRight className="size-[18px]" />
            </button>
          </div>
        ) : null}
      </main>

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent showClose>
          <SheetHeader>
            <SheetTitle>新建</SheetTitle>
            <SheetDescription>在当前目录创建内容。</SheetDescription>
          </SheetHeader>
          <div className="space-y-0.5">
            <SheetRow
              onClick={() => {
                setCreateOpen(false);
                uploadInputRef.current?.click();
              }}
            >
              <Upload />
              <span>
                <span className="block">上传文件</span>
                <span className="block text-[12px] text-text-muted">选择一个或多个本地文件</span>
              </span>
            </SheetRow>
            <SheetRow
              onClick={() => {
                setCreateOpen(false);
                void manager.createFolder();
              }}
            >
              <FolderPlus />
              <span>
                <span className="block">新建文件夹</span>
                <span className="block text-[12px] text-text-muted">创建后直接重命名</span>
              </span>
            </SheetRow>
          </div>
        </SheetContent>
      </Sheet>

      <MobileFileFilterSheet
        category={manager.category}
        open={filterOpen}
        sortMode={manager.sortMode}
        onCategoryChange={manager.setCategory}
        onOpenChange={setFilterOpen}
        onSortModeChange={manager.setSortMode}
      />
    </div>
  );
}

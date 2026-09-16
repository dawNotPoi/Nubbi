import { Header } from "@/component/Header";
import UploadListWrapper from "@/component/upload/UploadListWrapper";
import { FileList } from "@/features/file/components/FileList";
import { FileMoveDialog } from "@/features/file/components/FileMoveDialog";
import { FilePagination } from "@/features/file/components/FilePagination";
import { FileQuota } from "@/features/file/components/FileQuota";
import { FileToolbar } from "@/features/file/components/FileToolbar";
import { FileUploadButton } from "@/features/file/components/FileUploadButton";
import { MobileFileManager } from "@/features/file/components/MobileFileManager";
import { useFileManagerController } from "@/features/file/hooks/useFileManagerController";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Button } from "antd";
import { lazy, Suspense, type ReactElement } from "react";

const FilePreviewModal = lazy(() => import("./components/FilePreviewModal"));

export default function FileManager(): ReactElement {
  const manager = useFileManagerController();
  const isMobile = useIsMobile();
  const data = manager.data;
  const hasFilters = Boolean(manager.search) || manager.category !== "all";

  const sharedOverlays = (
    <>
      <FileMoveDialog
        breadcrumbs={manager.breadcrumbs}
        onClose={() => manager.setMoveOpen(false)}
        onConfirm={manager.moveTo}
        open={manager.moveOpen}
        targets={manager.moveTargets}
      />
      <UploadListWrapper
        onClose={() => manager.setUploadOpen(false)}
        open={manager.uploadOpen}
      />
      {manager.previewItem ? (
        <Suspense fallback={null}>
          <FilePreviewModal
            onClose={() => manager.setPreviewItem(null)}
            onDownload={(item) => void manager.download(item)}
            onNext={manager.previewNext}
            onPrev={manager.previewPrev}
            open
            position={manager.previewPosition}
            record={manager.previewItem}
          />
        </Suspense>
      ) : null}
    </>
  );

  if (isMobile) {
    return (
      <>
        <MobileFileManager manager={manager} />
        {sharedOverlays}
      </>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface text-text-primary">
      {manager.contextHolders}
      <Header className="bg-surface/95" />
      <main className="flex min-h-0 flex-1 flex-col px-4 pt-3 sm:px-6 md:px-12 lg:px-[68px]">
        <section className="mb-5 shrink-0">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-[32px] font-semibold leading-none tracking-[-0.015em] text-text-primary md:text-[40px]">
                Files
              </h1>
              <FileQuota stats={manager.stats} />
            </div>
            <div className="flex w-full items-center gap-2 min-[430px]:w-auto">
              <span className="flex-1 min-[430px]:flex-none">
                <FileUploadButton onSelect={manager.upload} />
              </span>
              <Button
                className="h-9 flex-1 rounded-md px-4 font-medium min-[430px]:flex-none"
                loading={manager.creating}
                onClick={() => void manager.createFolder()}
                type="primary"
              >
                新建文件夹
              </Button>
            </div>
          </div>
          <FileToolbar
            activeUploads={manager.activeUploads}
            breadcrumbs={manager.breadcrumbs}
            category={manager.category}
            dragging={Boolean(manager.draggingItems)}
            refreshing={manager.query.isFetching}
            search={manager.search}
            sortMode={manager.sortMode}
            onBreadcrumb={manager.navigateBreadcrumb}
            onCategoryChange={manager.setCategory}
            onDropFiles={manager.uploadTo}
            onDropItems={(item) => void manager.dropItemsOnFolder(item._id)}
            onRefresh={() => void manager.query.refetch()}
            onSearchChange={manager.setSearch}
            onSortChange={manager.setSortMode}
            onTransferOpen={() => manager.setUploadOpen(true)}
          />
        </section>

        <div className="min-h-0 flex-1 overflow-auto">
          <FileList
            draggingItems={manager.draggingItems}
            editingId={manager.editingId}
            emptyDescription={hasFilters ? "没有匹配的文件" : "当前目录暂无文件"}
            error={manager.query.isError}
            folderId={manager.parentId ?? null}
            folderName={manager.currentFolderName}
            hasFilters={hasFilters}
            items={manager.items}
            loading={manager.query.isLoading}
            pending={manager.query.isPlaceholderData}
            query={manager.search}
            selectedIds={manager.selectedIds}
            sortMode={manager.sortMode}
            onCancelRename={() => manager.setEditingId(null)}
            onClearFilters={() => {
              manager.setSearch("");
              manager.setCategory("all");
            }}
            onClearSelection={manager.clearSelection}
            onCreate={() => void manager.createFolder()}
            onDelete={manager.deleteOne}
            onDeleteSelected={manager.deleteSelected}
            onDownload={(item) => void manager.download(item)}
            onDropFiles={manager.uploadTo}
            onDropItems={(targetFolderId) => void manager.dropItemsOnFolder(targetFolderId)}
            onEndItemDrag={manager.endItemDrag}
            onMove={(item) => manager.openMove([item])}
            onMoveSelected={() => manager.openMove(manager.selectedItems)}
            onOpen={manager.openItem}
            onRename={manager.rename}
            onRetry={() => void manager.query.refetch()}
            onSelect={manager.select}
            onShare={(item) => void manager.share(item)}
            onSortChange={manager.setSortMode}
            onStartItemDrag={manager.startItemDrag}
            onToggle={manager.toggle}
            onToggleAll={manager.toggleAll}
            onUpload={manager.upload}
          />
        </div>
        <div className="shrink-0 pb-20">
          <FilePagination
            count={data?.count ?? manager.items.length}
            hasMore={data?.hasMore ?? false}
            limit={data?.limit ?? 20}
            offset={manager.offset}
            pending={manager.query.isPlaceholderData}
            total={data?.total ?? 0}
            onChange={manager.setOffset}
          />
        </div>
      </main>

      {sharedOverlays}
    </div>
  );
}

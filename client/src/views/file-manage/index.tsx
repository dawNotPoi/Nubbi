import { Header } from "@/component/Header";
import UploadListWrapper from "@/component/upload/UploadListWrapper";
import { FileList } from "@/features/file/components/FileList";
import { FileMoveDialog } from "@/features/file/components/FileMoveDialog";
import { FilePagination } from "@/features/file/components/FilePagination";
import { FileToolbar } from "@/features/file/components/FileToolbar";
import { FileUploadButton } from "@/features/file/components/FileUploadButton";
import { useFileManagerController } from "@/features/file/hooks/useFileManagerController";
import { Button } from "antd";
import { lazy, Suspense, type ReactElement } from "react";

const FilePreviewModal = lazy(() => import("./components/FilePreviewModal"));

export default function FileManager(): ReactElement {
  const manager = useFileManagerController();
  const data = manager.data;

  return (
    <div className="flex min-h-screen flex-col bg-white text-text-primary">
      {manager.contextHolders}
      <Header className="bg-white/95" />
      <main className="flex flex-1 flex-col min-h-0 px-4 pt-3 sm:px-6 md:px-12 lg:px-[68px]">
        <section className="mb-5 shrink-0">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <h1 className="text-[32px] font-bold leading-none tracking-normal text-text-primary md:text-[40px]">
              Files
            </h1>
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
            refreshing={manager.query.isFetching}
            search={manager.search}
            sortMode={manager.sortMode}
            onBreadcrumb={manager.navigateBreadcrumb}
            onCategoryChange={manager.setCategory}
            onRefresh={() => void manager.query.refetch()}
            onSearchChange={manager.setSearch}
            onSortChange={manager.setSortMode}
            onTransferOpen={() => manager.setUploadOpen(true)}
          />
        </section>

        <div className="flex-1 min-h-0 overflow-auto">
          <FileList
            editingId={manager.editingId}
          emptyDescription={manager.search || manager.category !== "all" ? "没有匹配的文件" : "当前目录暂无文件"}
          error={manager.query.isError}
          items={manager.items}
          loading={manager.query.isLoading}
          pending={manager.query.isPlaceholderData}
          selectedIds={manager.selectedIds}
          onCancelRename={() => manager.setEditingId(null)}
          onClearSelection={manager.clearSelection}
          onCreate={() => void manager.createFolder()}
          onDelete={manager.deleteOne}
          onDeleteSelected={manager.deleteSelected}
          onDownload={(item) => void manager.download(item)}
          onMove={(item) => manager.openMove([item])}
          onMoveSelected={() => manager.openMove(manager.selectedItems)}
          onOpen={manager.openItem}
          onRename={manager.rename}
          onRetry={() => void manager.query.refetch()}
          onSelectOnly={manager.selectOnly}
          onShare={(item) => void manager.share(item)}
          onToggle={manager.toggle}
          onToggleAll={manager.toggleAll}
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
            open
            record={manager.previewItem}
          />
        </Suspense>
      ) : null}
    </div>
  );
}

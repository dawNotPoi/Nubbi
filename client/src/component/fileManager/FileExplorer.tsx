import {
  EditOutlined,
  FolderAddOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import {
  Breadcrumb,
  Button,
  Checkbox,
  Input,
  Modal,
  Typography,
  Upload,
} from "antd";
import { forwardRef } from "react";
import type { FileId, RemoteFileRecord } from "./types";

export interface FileExplorerHandle {
  getSelectedIds: () => string[];
  clearSelection: () => void;
  navigateTo: (path: string | string[]) => void;
}

function FileExplorerImpl(
  props: {
    files: RemoteFileRecord[];
    loading?: boolean;
    onRefresh?: () => void;
    onUploadFile?: (file: File) => void;
    onOpenUploadList?: () => void;
    onDeleteFiles?: (ids: FileId[]) => Promise<void>;
    onRenameFile?: (id: FileId, name: string) => Promise<void>;
  },
  ref: React.Ref<FileExplorerHandle>
) {
  return (
    <div className="space-y-3">
      <Modal
        title="重命名"
        // open={renameModalOpen}
        // onOk={confirmRename}
        // onCancel={() => setRenameModalOpen(false)}
        okText="确定"
        cancelText="取消"
      >
        <Input
        // value={renameValue}
        // onChange={(e) => setRenameValue(e.target.value)}
        />
        <Typography.Paragraph type="secondary" className="mt-2 mb-0">
          仅修改文件名；如需移动目录可输入包含 “/” 的路径。
        </Typography.Paragraph>
      </Modal>

      <Modal
        title="新建文件夹（移动选中文件）"
        // open={newFolderModalOpen}
        // onOk={createFolderByMovingSelected}
        // onCancel={() => setNewFolderModalOpen(false)}
        okText="确定"
        cancelText="取消"
      >
        <Input
          placeholder="文件夹名称"
          // value={newFolderName}
          // onChange={(e) => setNewFolderName(e.target.value)}
        />
      </Modal>

      {/* 导航栏 */}
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Breadcrumb
              className="min-w-0"
              items={[
                {
                  title: (
                    <button
                      type="button"
                      className="truncate"
                      // onClick={() => navigateTo([])}
                    >
                      文件
                    </button>
                  ),
                },
                //   ...currentDirParts.map((part, index) => ({
                //     title: (
                //       <button
                //         type="button"
                //         className="truncate"
                //         onClick={() =>
                //           // navigateTo(currentDirParts.slice(0, index + 1))
                //         }
                //       >
                //         {part}
                //       </button>
                //     ),
                //   })
                // ),
              ]}
            />
          </div>
        </div>

        {/* 上传界面 */}
        <div className="flex flex-wrap items-center gap-2">
          <Upload
            showUploadList={false}
            customRequest={(option) => {
              const file = option.file as File;
              props.onUploadFile?.(file);
            }}
          >
            <Button type="primary" icon={<UploadOutlined />}>
              上传
            </Button>
          </Upload>

          {/* <Popconfirm
            title="删除文件"
            description={`确认删除选中的 ${selectedIds.length} 个文件？`}
            // onConfirm={deleteSelected}
            okText="确定"
            cancelText="取消"
            disabled={selectedIds.length === 0}
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              disabled={selectedIds.length === 0}
            >
              删除
            </Button>
          </Popconfirm> */}

          <Button
            icon={<EditOutlined />}
            // disabled={selectedIds.length !== 1}
            // onClick={() => openRenameFor(selectedIds[0]!)}
          >
            重命名
          </Button>

          <Button
            icon={<FolderAddOutlined />}
            // onClick={() => setNewFolderModalOpen(true)}
          >
            新建文件夹
          </Button>

          <Typography.Text type="secondary" className="ml-auto">
            {/* 已选 {selectedIds.length} 项 */}
          </Typography.Text>
        </div>
      </header>

      <section className="border rounded overflow-hidden">
        <div className="flex items-center gap-3 px-3 py-2 bg-zinc-50 border-b">
          <Checkbox
          // checked={allSelected}
          // indeterminate={!allSelected && selectedIds.length > 0}
          // onChange={(e) =>
          //   // setSelectedIds(e.target.checked ? fileIdsInDir : [])
          // }
          // disabled={fileIdsInDir.length === 0}
          />
          <Typography.Text type="secondary">选择本目录文件</Typography.Text>
        </div>

        <div className="divide-y">
          {/* {entries.folders.map((folder) => (
            <FolderListItem
              key={folder.pathParts.join("/")}
              folder={folder}
              onOpen={() => navigateTo(folder.pathParts)}
            />
          ))} */}

          {/* {entries.files.map((entry) => (
            <FileListItem
              key={entry.file._id}
              entry={entry}
              selected={selectedSet.has(entry.file._id)}
              onToggleSelect={() => {
                const id = entry.file._id;
                setSelectedIds((prev) =>
                  prev.includes(id)
                    ? prev.filter((x) => x !== id)
                    : [...prev, id]
                );
              }}
              onDownload={() => window.open(entry.file.path, "_blank")}
              onCopyLink={async () => {
                await window.navigator.clipboard.writeText(entry.file.path);
                messageApi.success("已复制链接");
              }}
              onRename={() => openRenameFor(entry.file._id)}
              onDelete={async () => props.onDeleteFiles([entry.file._id])}
            />
          ))} */}

          {/* {!props.loading &&
            entries.folders.length === 0 &&
            entries.files.length === 0 && (
              <div className="px-3 py-8 text-center text-zinc-500">
                空文件夹
              </div>
            )} */}
        </div>
      </section>
    </div>
  );
}

export default forwardRef(FileExplorerImpl);

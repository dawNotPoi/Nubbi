import { renameFile } from "@/api/file";
import FileExplorer from "@/component/fileManager/FileExplorer";
import type { FileId, RemoteFileRecord } from "@/component/fileManager/types";
import { useGlobalUpload } from "@/component/upload/hooks/GlobalUpload";
import UploadListWrapper from "@/component/upload/UploadListWrapper";
import { deleteFileAtom, getFilesAtom } from "@/store/atom/FileAtom";
import { message } from "antd";
import { useAtomValue } from "jotai";
import { useState } from "react";

const FileManager = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [open, setOpen] = useState(false);
  const { data, isLoading, refetch } = useAtomValue(getFilesAtom);
  const deleteFileMutation = useAtomValue(deleteFileAtom);
  const { createUploadTask } = useGlobalUpload();

  const deleteFiles = async (ids: FileId[]) => {
    if (ids.length === 0) return;
    await Promise.all(
      ids.map(
        (id) =>
          new Promise<void>((resolve, reject) => {
            deleteFileMutation.mutate(id, {
              onSuccess: () => resolve(),
              onError: (err) => reject(err),
            });
          })
      )
    );
    messageApi.success("删除成功");
  };

  const renameOne = async (id: FileId, name: string) => {
    const res = await renameFile(id, name);
    if (res.code === 1) {
      await refetch();
      messageApi.success("重命名成功");
      return;
    }
    messageApi.error("重命名失败");
  };

  return (
    <div>
      {contextHolder}
      <section className="h-full mb-20 pt-4">
        <FileExplorer
          files={(data || []) as RemoteFileRecord[]}
          loading={isLoading}
          onRefresh={refetch}
          onUploadFile={(file) => {
            createUploadTask(file);
            setOpen(true);
          }}
          onOpenUploadList={() => setOpen(true)}
          onDeleteFiles={deleteFiles}
          onRenameFile={renameOne}
        />
      </section>
      <UploadListWrapper open={open} onClose={() => setOpen(false)} />
    </div>
  );
};

export default FileManager;


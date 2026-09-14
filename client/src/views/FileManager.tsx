import FileExplorer from "@/component/fileManager/FileExplorer";
import { RemoteFileRecord } from "@/component/fileManager/types";
import { useGlobalUpload } from "@/component/upload/hooks/GlobalUpload";
import UploadListWrapper from "@/component/upload/UploadListWrapper";
import { listFilesAtom } from "@/store/atom/FileAtom";
import { Button } from "antd";
import { useAtom } from "jotai";
import { useEffect, useState } from "react";

const FileManager = () => {
  // const [messageApi, contextHolder] = message.useMessage();
  const [open, setOpen] = useState(false);
  const [parnentId, setParentId] = useState();
  const [{ mutate, data, isPending }] = useAtom(listFilesAtom);
  const [pathDirs, setPathDirs] = useState([]);
  useEffect(() => {
    mutate(parnentId);
  }, [parnentId]);

  const { createUploadTask } = useGlobalUpload();

  return (
    <div className="p-2">
      <section className="h-full mb-20 pt-4">
        <Button
          onClick={() => {
            setOpen(true);
          }}
        >
          上传列表
        </Button>
        <FileExplorer
          files={data?.data || ([] as RemoteFileRecord[])}
          loading={isPending}
          onUploadFile={(file) => {
            createUploadTask(file);
            setOpen(true);
          }}
          onOpenUploadList={() => setOpen(true)}
        />
      </section>
      <UploadListWrapper open={open} onClose={() => setOpen(false)} />
    </div>
  );
};

export default FileManager;

import { listFiles } from "@/api/file";
import { useGlobalUpload } from "@/component/upload/hooks/GlobalUpload";
import UploadListWrapper from "@/component/upload/UploadListWrapper";
import {
  breadcrumbsAtom,
  createFloderMutationAtom,
  currentFolderIdAtom,
  listFilesAtom,
} from "@/store/atom/FileAtom";
import { UploadOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { useAtomValue, useSetAtom } from "jotai";
import { RotateCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import FileListTable from "./components/FileListTable";
import FolderBreadcrumbs from "./components/FolderBreadcrumbs";
import { buildFilePath, isSameCrumbs, type CrumbItem } from "./routePath";

const FileManager = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const folderId = useAtomValue(currentFolderIdAtom);
  const crumbs = useAtomValue(breadcrumbsAtom);
  const setCrumbs = useSetAtom(breadcrumbsAtom);
  const {
    data: files,
    refetch,
    isLoading,
    isFetching,
    isPending,
  } = useAtomValue(listFilesAtom);
  const { mutate: createFolderMutation } = useAtomValue(
    createFloderMutationAtom,
  );

  const { createUploadTask } = useGlobalUpload();

  const handleOpenFolder = (folder: any) => {
    if (!folder?._id) return;

    const nextCrumbs = [
      ...crumbs,
      {
        id: String(folder._id),
        name: folder.name ?? "未命名文件夹",
      },
    ];

    setCrumbs(nextCrumbs);
    navigate(buildFilePath(nextCrumbs));
  };

  // 纯 id 链接直达时，逐层回查真实文件夹名
  useEffect(() => {
    const unresolved = crumbs.some((item) => item.name === item.id);
    if (!unresolved || crumbs.length === 0) return;

    let cancelled = false;

    const resolveCrumbNames = async () => {
      let parentId: string | undefined;
      const resolved: CrumbItem[] = [];

      for (const crumb of crumbs) {
        try {
          const res = await listFiles(parentId);
          const folder = res.data.folders.find(
            (item) => String(item._id) === crumb.id,
          );
          resolved.push({
            id: crumb.id,
            name: folder?.name ?? crumb.name,
          });
        } catch {
          resolved.push(crumb);
        }

        parentId = crumb.id;
      }

      if (cancelled || isSameCrumbs(crumbs, resolved)) return;
      setCrumbs(resolved);
    };

    resolveCrumbNames();

    return () => {
      cancelled = true;
    };
  }, [crumbs, setCrumbs]);

  return (
    <div className="p-2">
      <header className="flex gap-2  pb-4">
        <Button onClick={() => setOpen(true)}>传输</Button>
        <Button onClick={() => createFolderMutation({ parentId: folderId })}>
          新建文件夹
        </Button>
        <UploadButton
          onFileSelect={(file) => {
            createUploadTask(file);
            setOpen(true);
          }}
        />
      </header>

      <div>
        <nav className="border-t flex">
          <FolderBreadcrumbs />
          <div className="flex-1"></div>
          <div className="mr-10 py-4">
            <button title="刷新">
              <RotateCw onClick={() => refetch()} className="size-4" />
            </button>
          </div>
        </nav>
        <main>
          <FileListTable
            list={files?.data}
            onOpenFolder={handleOpenFolder}
            isLoading={isFetching}
          />
        </main>
      </div>
      <UploadListWrapper open={open} onClose={() => setOpen(false)} />
    </div>
  );
};

const UploadButton = ({
  onFileSelect,
}: {
  onFileSelect: (file: File) => void;
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handlerClick = () => {
    fileInputRef.current?.click();
  };
  return (
    <div className="inline-block">
      <Button type="primary" icon={<UploadOutlined />} onClick={handlerClick}>
        上传
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
      />
    </div>
  );
};

export default FileManager;

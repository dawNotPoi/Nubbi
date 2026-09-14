import { Button, Input } from "antd";
import clsx from "clsx";
import { Copy, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import type { ImageStatus } from "../types";
import { formatImageFileSize } from "../upload";

type ImagePopoverTab = "upload" | "embed" | "details" | "actions";

export interface ImagePopoverContentProps {
  alt?: string | null;
  fileInputId: string;
  maxFileSize?: number;
  onCopyUrl: () => void;
  onDelete: () => void;
  onEmbedUrl: (url: string) => void;
  onSaveDetails: (attrs: { alt: string | null; title: string | null }) => void;
  onUploadFile: (file: File | undefined) => void;
  src?: string | null;
  status: ImageStatus;
  title?: string | null;
}

const doneTabs: { label: string; value: ImagePopoverTab }[] = [
  { label: "替换图片", value: "upload" },
  { label: "图片链接", value: "embed" },
  { label: "描述", value: "details" },
  { label: "操作", value: "actions" },
];

const pendingTabs: { label: string; value: ImagePopoverTab }[] = [
  { label: "上传图片", value: "upload" },
  { label: "嵌入链接", value: "embed" },
];

const ImagePopoverContent = ({
  alt,
  fileInputId,
  maxFileSize,
  onCopyUrl,
  onDelete,
  onEmbedUrl,
  onSaveDetails,
  onUploadFile,
  src,
  status,
  title,
}: ImagePopoverContentProps) => {
  const [link, setLink] = useState(src ?? "");
  const [draftAlt, setDraftAlt] = useState(alt ?? "");
  const [draftTitle, setDraftTitle] = useState(title ?? "");
  const tabs = status === "done" ? doneTabs : pendingTabs;
  const [selectedTab, setSelectedTab] = useState<ImagePopoverTab>(
    status === "done" ? "details" : "upload",
  );

  return (
    <div className="w-[min(500px,calc(100vw-24px))] rounded-md border bg-white py-1">
      <header className="flex gap-1 overflow-x-auto border-b px-2 pt-1 scrollbar-none">
        {tabs.map((tab) => (
          <button
            type="button"
            onClick={() => setSelectedTab(tab.value)}
            key={tab.value}
            className={clsx(
              " hover:bg-[rgba(249,248,247)]  p-1 py-2",
              tab.value === selectedTab && "border-b border-black",
            )}
          >
            {tab.label}
          </button>
        ))}
      </header>
      <main className="p-4 space-y-4 w-full">
        {selectedTab === "upload" && (
          <>
            <label htmlFor={fileInputId}>
              <div className="border cursor-pointer rounded-md py-1 hover:bg-[rgba(249,248,247)] w-full  flex justify-center ">
                <Upload className="mr-2" size={16} />
                <span>{status === "done" ? "替换图片" : "图片上传"}</span>
              </div>
              <input
                name={fileInputId}
                id={fileInputId}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  onUploadFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
            <footer className="text-center  text-gray-500 text-[12px]">
              请选择要上传的图片文件，最大 {formatImageFileSize(maxFileSize ?? 0)}
            </footer>
          </>
        )}
        {selectedTab === "embed" && (
          <>
            <Input
              placeholder="请输入嵌入的图片链接"
              value={link}
              onChange={(event) => setLink(event.target.value)}
            />
            <div className="flex justify-center">
              <Button
                onClick={() => onEmbedUrl(link)}
                type="primary"
                className="mx-auto w-full max-w-[300px]"
              >
                {status === "done" ? "更新链接" : "嵌入图片"}
              </Button>
            </div>
          </>
        )}
        {selectedTab === "details" && (
          <>
            <Input
              placeholder="图片描述 alt"
              value={draftAlt}
              onChange={(event) => setDraftAlt(event.target.value)}
            />
            <Input
              placeholder="图片标题 title"
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
            />
            <div className="flex justify-center">
              <Button
                onClick={() =>
                  onSaveDetails({
                    alt: draftAlt.trim() || null,
                    title: draftTitle.trim() || null,
                  })
                }
                type="primary"
                className="mx-auto w-full max-w-[300px]"
              >
                保存描述
              </Button>
            </div>
          </>
        )}
        {selectedTab === "actions" && (
          <div className="flex gap-2">
            <Button
              className="flex flex-1 items-center justify-center gap-2"
              disabled={!src}
              onClick={onCopyUrl}
            >
              <Copy size={16} />
              复制链接
            </Button>
            <Button
              className="flex flex-1 items-center justify-center gap-2"
              danger
              onClick={onDelete}
            >
              <Trash2 size={16} />
              删除图片
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default ImagePopoverContent;

import Popover from "@/component/UI/Popover";
import { LoadingOutlined } from "@ant-design/icons";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { Button, Input, message } from "antd";
import clsx from "clsx";
import { Copy, PictureInPicture, Trash2, Upload } from "lucide-react";
import type { KeyboardEvent } from "react";
import { useId, useState } from "react";
import {
  cancelImageUpload,
  DImageOptions,
  formatImageFileSize,
  getImageFileValidationError,
  getImageUploadPreviewUrl,
  ImageNodeAttrs,
  isValidImageUrl,
  startImageUpload,
} from ".";
import "./index.css";

type ImagePopoverTab = "upload" | "embed" | "details" | "actions";

const ImageNodeView = ({
  node,
  editor,
  updateAttributes,
  deleteNode,
  extension,
}: NodeViewProps) => {
  const {
    alt,
    errorMessage,
    src,
    status = "done",
    uploadId,
  } = node.attrs as ImageNodeAttrs;
  const [open, setOpen] = useState(false);
  const fileInputId = useId();
  const { maxFileSize, uploadHandler } = extension.options as DImageOptions;
  const previewUrl = getImageUploadPreviewUrl(uploadId);

  const uploadFile = (file: File | undefined) => {
    if (!file) return;

    if (!uploadHandler) {
      message.error("未配置图片上传方法");
      return;
    }

    const validationError = getImageFileValidationError(file, maxFileSize);
    if (validationError) {
      message.warning(validationError);
      return;
    }

    cancelImageUpload(uploadId, editor);

    const started = startImageUpload({
      editor,
      file,
      maxFileSize,
      uploadHandler,
      updateAttributes,
    });

    if (started) {
      setOpen(false);
    }
  };

  const embedImageUrl = (value: string) => {
    const nextSrc = value.trim();
    if (!isValidImageUrl(nextSrc)) {
      message.warning("请输入有效的图片链接");
      return;
    }

    updateAttributes({
      errorMessage: null,
      src: nextSrc,
      status: "done",
      uploadId: null,
    });
    setOpen(false);
  };

  const deleteImage = () => {
    cancelImageUpload(uploadId, editor);
    deleteNode();
  };

  const copyImageUrl = async () => {
    if (!src) return;

    try {
      await navigator.clipboard.writeText(src);
      message.success("图片链接已复制");
    } catch {
      message.error("复制失败");
    }
  };

  const handlePlaceholderKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    setOpen(true);
  };

  const PopoverContent = () => {
    const [link, setLink] = useState(src ?? "");
    const [draftAlt, setDraftAlt] = useState(alt ?? "");
    const [draftTitle, setDraftTitle] = useState(node.attrs.title ?? "");
    const tabs: { label: string; value: ImagePopoverTab }[] =
      status === "done"
        ? [
            { label: "替换图片", value: "upload" },
            { label: "图片链接", value: "embed" },
            { label: "描述", value: "details" },
            { label: "操作", value: "actions" },
          ]
        : [
            { label: "上传图片", value: "upload" },
            { label: "嵌入链接", value: "embed" },
          ];
    const [selectedTab, setSelectedTab] = useState<ImagePopoverTab>(
      status === "done" ? "details" : "upload",
    );

    const saveDetails = () => {
      updateAttributes({
        alt: draftAlt.trim() || null,
        title: draftTitle.trim() || null,
      });
      setOpen(false);
    };

    return (
      <div className="w-[500px]  py-1 bg-white border rounded-md">
        <header className="px-2 pt-1  flex gap-1 border-b">
          {tabs.map((tab) => {
            return (
              <button
                type="button"
                onClick={() => {
                  setSelectedTab(tab.value);
                }}
                key={tab.value}
                className={clsx(
                  " hover:bg-[rgba(249,248,247)]  p-1 py-2",
                  tab.value === selectedTab && "border-b border-black",
                )}
              >
                {tab.label}
              </button>
            );
          })}
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
                  onChange={(e) => {
                    uploadFile(e.target.files?.[0]);
                    e.target.value = "";
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
                onChange={(e) => setLink(e.target.value)}
              />
              <div className="flex justify-center">
                <Button
                  onClick={() => {
                    embedImageUrl(link);
                  }}
                  type="primary"
                  className="w-[300px] mx-auto"
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
                  onClick={saveDetails}
                  type="primary"
                  className="w-[300px] mx-auto"
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
                onClick={() => void copyImageUrl()}
              >
                <Copy size={16} />
                复制链接
              </Button>
              <Button
                className="flex flex-1 items-center justify-center gap-2"
                danger
                onClick={deleteImage}
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

  if (status === "placeholder" || status === "error") {
    return (
      <NodeViewWrapper className="image-node-view img-mark">
        <Popover
          open={open}
          onClickOutside={() => {
            setOpen(false);
          }}
          trigger={
            <div
              onClick={() => {
                setOpen(true);
              }}
              onKeyDown={handlePlaceholderKeyDown}
              role="button"
              tabIndex={0}
              className="upload-placeholder rounded-md cursor-pointer flex bg-[rgba(249,248,247)] text-gray-400 text-[14px] items-center p-4"
              contentEditable={false}
            >
              <PictureInPicture size={20} />
              <span className="ml-2 ">
                {status === "error" ? errorMessage || "图片上传失败" : "上传图片"}
              </span>
            </div>
          }
        >
          <PopoverContent />
        </Popover>
      </NodeViewWrapper>
    );
  }

  const imageNode = (
    <div className="image-node-view flex justify-center  relative">
      <img
        className="max-w-full img-mark h-auto rounded-sm block"
        src={status === "done" ? src ?? "" : previewUrl}
        alt={alt ?? ""}
        title={node.attrs.title ?? undefined}
      />
      {status === "uploading" && (
        <div className="absolute  bg-black/30 right-0 bottom-0 size-8 flex items-center justify-center">
          <LoadingOutlined />
        </div>
      )}
    </div>
  );

  if (status === "done") {
    return (
      <NodeViewWrapper className="image-node-view" contentEditable={false}>
        <Popover
          open={open}
          onClickOutside={() => setOpen(false)}
          trigger={
            <div onClick={() => setOpen(true)} contentEditable={false}>
              {imageNode}
            </div>
          }
        >
          <PopoverContent />
        </Popover>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper className="image-node-view" contentEditable={false}>
      {imageNode}
    </NodeViewWrapper>
  );
};

export default ImageNodeView;

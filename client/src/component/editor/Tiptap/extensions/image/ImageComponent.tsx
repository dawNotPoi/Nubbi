import Popover from "@/component/UI/Popover";
import { LoadingOutlined } from "@ant-design/icons";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { message } from "antd";
import { PictureInPicture } from "lucide-react";
import type { KeyboardEvent } from "react";
import { useId, useState } from "react";
import ImagePopoverContent from "./components/ImagePopoverContent";
import type { DImageOptions, ImageNodeAttrs } from "./types";
import {
  cancelImageUpload,
  getImageFileValidationError,
  getImageUploadPreviewUrl,
  isValidImageUrl,
  startImageUpload,
} from "./upload";
import "./index.css";

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

  const popoverContent = (
    <ImagePopoverContent
      alt={alt}
      fileInputId={fileInputId}
      maxFileSize={maxFileSize}
      onCopyUrl={() => void copyImageUrl()}
      onDelete={deleteImage}
      onEmbedUrl={embedImageUrl}
      onSaveDetails={(attrs) => {
        updateAttributes(attrs);
        setOpen(false);
      }}
      onUploadFile={uploadFile}
      src={src}
      status={status}
      title={node.attrs.title}
    />
  );

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
          {popoverContent}
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
          {popoverContent}
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

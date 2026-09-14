import Popover from "@/component/UI/Popover";
import { LoadingOutlined } from "@ant-design/icons";
import { NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { Button, Input, message } from "antd";
import clsx from "clsx";
import { PictureInPicture } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { DImageOptions } from ".";
import "./index.css";

const ImageNodeView: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
  extension,
}) => {
  const { status, file, src } = node.attrs;
  const [open, setOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const isUploading = useRef(false);
  const { uploadHandler } = extension.options as DImageOptions;

  useEffect(() => {
    if (!uploadHandler) {
      console.error("未配置上传方法");
      return;
    }

    if (status !== "uploading" || isUploading.current) {
      return;
    }

    isUploading.current = true;

    const upload = async () => {
      try {
        const url = await uploadHandler(file);
        if (!url) throw new Error("上传失败 请重试");
        updateAttributes({ src: url, status: "done" });
      } catch (error) {
        console.error("图片上传失败", error);
        message.error("图片上传失败，请重试");
        isUploading.current = false;
        updateAttributes({ file: null, src: null, status: "placeholder" });
      }
    };

    void upload();
  }, [status, file, uploadHandler, updateAttributes]);

  useEffect(() => {
    if (status === "done" || !file) {
      setPreviewUrl("");
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(nextPreviewUrl);

    return () => {
      URL.revokeObjectURL(nextPreviewUrl);
    };
  }, [file, status]);

  const PopoverContent = () => {
    const [link, setLink] = useState("");
    const tabs = [
      { label: "上传图片", value: "upload" },
      { label: "嵌入链接", value: "embed" },
    ];
    const [selectedTab, setSelectedTab] = useState("upload");

    return (
      <div className="w-[500px]  py-1 bg-white border rounded-md">
        <header className="px-2 pt-1  flex gap-1 border-b">
          {tabs.map((tab) => {
            return (
              <button
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
              <label htmlFor="file-upload">
                <div className="border cursor-pointer rounded-md py-1 hover:bg-[rgba(249,248,247)] w-full  flex justify-center ">
                  <span>图片上传</span>
                </div>
                <input
                  name="file-upload"
                  id="file-upload"
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      updateAttributes({ file, status: "uploading" });
                    }
                  }}
                />
              </label>
              <footer className="text-center  text-gray-500 text-[12px]">
                请选择要上传的图片文件
              </footer>
            </>
          )}
          {selectedTab === "embed" && (
            <>
              <Input
                placeholder="请输入嵌入的图片链接"
                onChange={(e) => setLink(e.target.value)}
              ></Input>
              <div className="flex justify-center">
                <Button
                  onClick={() => {
                    updateAttributes({
                      src: link,
                      status: "done",
                    });
                  }}
                  type="primary"
                  className="w-[300px] mx-auto"
                >
                  嵌入图片
                </Button>
              </div>
            </>
          )}
        </main>
      </div>
    );
  };

  if (status === "placeholder") {
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
              className="upload-placeholder rounded-md cursor-pointer flex bg-[rgba(249,248,247)] text-gray-400 text-[14px] items-center p-4"
              contentEditable={false}
            >
              <PictureInPicture size={20} />
              <span className="ml-2 ">上传图片</span>
            </div>
          }
        >
          <PopoverContent />
        </Popover>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper className="image-node-view flex justify-center  relative">
      <img
        className="max-w-full img-mark h-auto rounded-sm block"
        src={status === "done" ? src : previewUrl}
        alt={file?.name}
      />
      {status === "uploading" && (
        <div className="absolute  bg-black/30 right-0 bottom-0 size-8 flex item-center justify-center">
          <LoadingOutlined />
        </div>
      )}
    </NodeViewWrapper>
  );
};

export default ImageNodeView;

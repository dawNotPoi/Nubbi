import Popover from "@/component/UI/Popover";
import { LoadingOutlined } from "@ant-design/icons";
import { NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { Button, Input } from "antd";
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

  const isUploading = useRef(false);

  const { uploadHandler } = extension.options as DImageOptions;

  //在loding状态时会自动上传文件
  useEffect(() => {
    if (!uploadHandler) {
      console.error("未配置上传方法");
      return;
    }
    if (status === "uploading" && !isUploading.current) {
      isUploading.current = true;
      const upload = async () => {
        const url = await uploadHandler(file);
        if (!url) throw new Error("上传失败 请重试");
        updateAttributes({ src: url, status: "done" });
      };
      upload();
    }
  }, [status, file]);

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
                  tab.value === selectedTab && "border-b border-black"
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
                最大只能上传5MB大小的图片
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

  // 状态 1：Waiting - 显示上传控制台
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

  // 状态 2：不为placeholder
  return (
    <NodeViewWrapper className="image-node-view flex justify-center  relative">
      <img
        className="max-w-full img-mark h-auto rounded-sm block"
        src={status === "done" ? src : URL.createObjectURL(file) || ""}
        alt={file?.name}
      />
      {/* 上传中添加loding */}
      {status === "uploading" && (
        <div className="absolute  bg-black/30 right-0 bottom-0 size-8 flex item-center justify-center">
          <LoadingOutlined />
        </div>
      )}
    </NodeViewWrapper>
  );
};

export default ImageNodeView;

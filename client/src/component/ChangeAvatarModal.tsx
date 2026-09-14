import { imgToGitCloud } from "@/api/file";
import { Button, Input, Modal, Tabs, Upload, message } from "antd";
import type { TabsProps } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useState } from "react";

type ChangeAvatarModalProps = {
  open: boolean;
  currentImage?: string;
  onClose: () => void;
  onConfirm: (url: string) => Promise<{ success: boolean; error?: { message?: string } }>;
};

const ChangeAvatarModal = ({
  open,
  currentImage,
  onClose,
  onConfirm,
}: ChangeAvatarModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [linkUrl, setLinkUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const resetState = () => {
    setFile(null);
    setPreviewUrl("");
    setLinkUrl("");
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleConfirm = async () => {
    setUploading(true);
    try {
      let url = "";
      if (file) {
        url = await imgToGitCloud(file);
      } else if (linkUrl.trim()) {
        url = linkUrl.trim();
      }

      if (!url) {
        message.warning("请选择图片或粘贴图片链接");
        setUploading(false);
        return;
      }
      if (result.success) {
        message.success("头像更换成功");
        handleClose();
      } else {
        message.error(result.error?.message || "头像更换失败");
      }
    } catch {
      message.error("头像更换失败，请稍后重试");
    } finally {
      setUploading(false);
    }
  };

  const uploadTabContent = (
    <div className="flex flex-col items-center gap-4">
      <Upload
        accept="image/*"
        showUploadList={false}
        beforeUpload={(selectedFile) => {
          const isImage = selectedFile.type.startsWith("image/");
          if (!isImage) {
            message.error("请选择图片文件");
            return Upload.LIST_IGNORE;
          }
          const isLt5M = selectedFile.size / 1024 / 1024 < 5;
          if (!isLt5M) {
            message.error("图片大小不能超过 5MB");
            return Upload.LIST_IGNORE;
          }

          setFile(selectedFile);
          setLinkUrl("");
          const reader = new FileReader();
          reader.onload = (e) => {
            setPreviewUrl((e.target?.result as string) || "");
          };
          reader.readAsDataURL(selectedFile);
          return false;
        }}
      >
        <div className="flex flex-col items-center gap-2 cursor-pointer p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors">
          {previewUrl && file ? (
            <img
              src={previewUrl}
              alt="预览"
              className="size-24 rounded-full object-cover"
            />
          ) : (
            <div className="size-24 rounded-full bg-gray-100 flex items-center justify-center">
              <PlusOutlined className="text-gray-400 text-2xl" />
            </div>
          )}
          <span className="text-sm text-gray-500">
            {file ? file.name : "点击选择图片（最大 5MB）"}
          </span>
        </div>
      </Upload>
    </div>
  );

  const linkTabContent = (
    <div className="flex flex-col gap-3">
      <Input
        placeholder="粘贴图片链接（https://...）"
        value={linkUrl}
        onChange={(e) => {
          setLinkUrl(e.target.value);
          if (e.target.value.trim()) {
            setFile(null);
            setPreviewUrl(e.target.value.trim());
          } else {
            setPreviewUrl("");
          }
        }}
      />
      {linkUrl.trim() && (
        <div className="flex items-center gap-2">
          <img
            src={linkUrl.trim()}
            alt="链接预览"
            className="size-20 rounded-full object-cover border"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <span className="text-xs text-gray-400">链接预览</span>
        </div>
      )}
    </div>
  );

  const tabItems: TabsProps["items"] = [
    {
      key: "upload",
      label: "上传图片",
      children: uploadTabContent,
    },
    {
      key: "link",
      label: "粘贴链接",
      children: linkTabContent,
    },
  ];

  return (
    <Modal
      title="更换头像"
      open={open}
      onCancel={handleClose}
      footer={[
        <Button key="cancel" onClick={handleClose}>
          取消
        </Button>,
        <Button
          key="confirm"
          type="primary"
          loading={uploading}
          disabled={!file && !linkUrl.trim()}
          onClick={handleConfirm}
        >
          确认更换
        </Button>,
      ]}
      destroyOnClose
    >
      <div className="mb-4 flex justify-center">
        <img
          src={currentImage || "/default.jpg"}
          alt="当前头像"
          className="size-16 rounded-full object-cover border-2 border-gray-200"
        />
      </div>
      <Tabs
        defaultActiveKey="upload"
        items={tabItems}
        onChange={() => {
          setFile(null);
          setLinkUrl("");
          setPreviewUrl("");
        }}
      />
    </Modal>
  );
};

export default ChangeAvatarModal;

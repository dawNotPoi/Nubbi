import { Button } from "antd";
import { DragEventHandler } from "react";
import { imgToGitCloud } from "@/api/file";

const ImgToGitupload = ({ onFinish, onPreRender }: any) => {
  const readPreview = (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const fileContent = event.target?.result;
        if (typeof fileContent !== "string") {
          reject(new Error("文件读取失败"));
          return;
        }

        onPreRender?.(fileContent);
        resolve(fileContent);
      };

      reader.onerror = () => reject(reader.error ?? new Error("文件读取失败"));
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = async (file: File) => {
    try {
      await readPreview(file);
      const url = await imgToGitCloud(file);
      onFinish?.(url);
    } catch (error) {
      console.error("图片上传失败", error);
    }
  };

  const handleDrop: DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      void handleUpload(file);
    }
  };

  const getFile = () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.onchange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        void handleUpload(file);
      }
    };
    fileInput.click();
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(event) => event.preventDefault()}
      style={{
        border: "2px dashed #ddd",
        padding: "20px",
        textAlign: "center",
      }}
    >
      <Button onClick={getFile}>Upload</Button>

      <div style={{ marginTop: "16px" }}>
        <span style={{ fontSize: "12px" }}>
          The maximum size per file is 5MB
        </span>
      </div>
    </div>
  );
};

export default ImgToGitupload;

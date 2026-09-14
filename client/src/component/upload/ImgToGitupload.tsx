import { Button } from "antd";
import { DragEventHandler } from "react";

const ImgToGitupload = ({ onFinish, onPreRender }: any) => {
  const handleUpload = async (file: File) => {
    const token = import.meta.env.VITE_GITHUB_TOKEN;
    const repo = import.meta.env.VITE_GITHUB_REPO; // 填你的仓库 repo;

    const formData = new FormData();
    formData.append("file", file);
    const reader = new FileReader();
    function getBase64(file: File) {
      return new Promise((resolve) => {
        reader.onload = function (event) {
          const fileContent = event.target?.result;
          console.log("i get file", fileContent);
          onPreRender(fileContent);

          resolve((fileContent as string).split(",")[1]);
        };
        reader.readAsDataURL(file);
      });
    }
    const path = "img/" + new Date().valueOf() + file.name;

    const content = await getBase64(file);
    const url = "https://api.github.com/repos/" + repo + "/contents/" + path;

    const res = await fetch(url, {
      method: "put",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Upload image",
        content,
        branch: "main",
        path,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      console.log("i get data", data);
      onFinish(data.content.download_url);
    } else {
      console.log("文件格式错误");
    }
  };

  const handleDrop: DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    handleUpload(file);
  };

  const getFile = () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.onchange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      const files = target.files;
      const file = files?.[0];
      if (file) handleUpload(file);
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

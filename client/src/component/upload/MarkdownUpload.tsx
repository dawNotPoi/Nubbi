import { message } from "antd";
import { DragEventHandler, FC, PropsWithChildren } from "react";
import { unlockMd } from "../../utils/md";
// 解析md文档

type props = {
  onFinish: (props: ReturnType<typeof unlockMd>) => void;
};
const MarkdownUpload: FC<props & PropsWithChildren> = ({
  children,
  onFinish,
}) => {
  const [messageApi, contextHolder] = message.useMessage();
  const handleDrop: DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    const file = files[0]; // 假设只处理一个文件
    handleFile(file);
  };
  const handleFile = (file: File) => {
    if (!file.name.match(/\.(md|markdown)$/i)) {
      messageApi.warning("上传文件格式错误,请删除markdown文件");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target!.result as string;
      const mdObject = unlockMd(result);
      onFinish(mdObject);
    };
    reader.readAsText(file);
  };

  const getFile = () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".markdown,.md,text/markdown";
    fileInput.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const files = target.files;
      const file = files?.[0];
      if (!file) return;
      if (files && files.length > 0) {
        handleFile(file);
      }
    };
    fileInput.click();
  };
  return (
    <div
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
      onClick={getFile}
    >
      {contextHolder}
      {children && children}
      {!children && (
        <button>
          <p>上传</p>
        </button>
      )}
    </div>
  );
};

export default MarkdownUpload;

import { imgToGitCloud } from "@/api/file";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import type { DragEventHandler, ReactElement } from "react";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

type ImgToGitUploadProps = {
  onFinish?: (url: string) => void;
  onPreRender?: (previewUrl: string) => void;
};

const getValidationError = (file: File): string | null => {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) return "不支持该图片格式";
  if (file.size > MAX_IMAGE_SIZE) return "图片大小不能超过 5MB";
  return null;
};

const ImgToGitupload = ({
  onFinish,
  onPreRender,
}: ImgToGitUploadProps): ReactElement => {
  const readPreview = (file: File): Promise<string> => {
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

  const handleUpload = async (file: File): Promise<void> => {
    const validationError = getValidationError(file);
    if (validationError) {
      toast.warning(validationError);
      return;
    }

    try {
      await readPreview(file);
      const url = await imgToGitCloud(file);
      onFinish?.(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "图片上传失败");
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
    fileInput.accept = Array.from(ALLOWED_IMAGE_TYPES).join(",");
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
      className="border-2 border-dashed border-border-button p-5 text-center"
    >
      <Button onClick={getFile}>上传图片</Button>

      <div className="mt-4">
        <span className="text-xs text-text-muted">单张图片最大 5MB</span>
      </div>
    </div>
  );
};

export default ImgToGitupload;

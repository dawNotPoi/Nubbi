import { Button } from "antd";
import { useRef } from "react";

interface FileUploadButtonProps {
  onSelect: (files: File[]) => void;
}

export function FileUploadButton({ onSelect }: FileUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button
        className="h-9 w-full rounded-md px-4 font-medium min-[430px]:w-auto"
        onClick={() => inputRef.current?.click()}
      >
        上传文件
      </Button>
      <input
        className="hidden"
        multiple
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length > 0) onSelect(files);
          event.target.value = "";
        }}
        ref={inputRef}
        type="file"
      />
    </>
  );
}

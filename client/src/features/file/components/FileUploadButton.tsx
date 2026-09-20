import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { useRef } from "react";

interface FileUploadButtonProps {
  className?: string;
  label?: string;
  onSelect: (files: File[]) => void;
}

export function FileUploadButton({
  className,
  label = "上传文件",
  onSelect,
}: FileUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button
        className={
          className ??
          "h-9 w-full rounded-control px-4 font-medium min-[430px]:w-auto"
        }
        icon={<Upload />}
        onClick={() => inputRef.current?.click()}
        size="lg"
        variant="outline"
      >
        {label}
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

import { Button } from "@/components/ui/button";
import clsx from "clsx";
import { Upload } from "lucide-react";
import { useRef, useState, type ReactElement } from "react";

type MarkdownImportButtonProps = {
  disabled?: boolean;
  importing?: boolean;
  onImport: (files: File[]) => void;
};

/**
 * 保留 Markdown 文件选择与拖入导入流程，仅统一操作按钮。
 * @param props 可用状态、导入进度和文件回调。
 * @returns 支持拖入文件的导入按钮。
 */
export function MarkdownImportButton({
  disabled = false,
  importing = false,
  onImport,
}: MarkdownImportButtonProps): ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const unavailable = disabled || importing;

  /**
   * 提交选中文件并清空原生输入，允许再次选择同一个文件。
   * @param fileList 浏览器提供的文件集合。
   * @returns 无返回值。
   */
  const submitFiles = (fileList: FileList | null): void => {
    const files = Array.from(fileList ?? []);
    if (files.length > 0) onImport(files);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div
      onDragLeave={() => setDragging(false)}
      onDragOver={(event) => {
        event.preventDefault();
        if (!unavailable) setDragging(true);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (!unavailable) submitFiles(event.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        accept=".md,.markdown,text/markdown,text/x-markdown"
        className="hidden"
        multiple
        onChange={(event) => submitFiles(event.target.files)}
        type="file"
      />
      <Button
        variant="outline"
        size="sm"
        loading={importing}
        icon={<Upload aria-hidden="true" className="size-4" />}
        className={clsx(
          "rounded-md font-medium",
          dragging && "border-accent-border bg-accent-bg text-accent-text",
        )}
        disabled={unavailable}
        onClick={() => inputRef.current?.click()}
        type="button"
      >
        <span>{importing ? "导入中" : "导入 Markdown"}</span>
      </Button>
    </div>
  );
}


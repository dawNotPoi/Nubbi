import clsx from "clsx";
import { LoaderCircle, Upload } from "lucide-react";
import { useRef, useState } from "react";

type MarkdownImportButtonProps = {
  disabled?: boolean;
  importing?: boolean;
  onImport: (files: File[]) => void;
};

export function MarkdownImportButton({
  disabled = false,
  importing = false,
  onImport,
}: MarkdownImportButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const unavailable = disabled || importing;

  const submitFiles = (fileList: FileList | null) => {
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
      <button
        className={clsx(
          "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring",
          dragging
            ? "border-accent-border bg-accent-bg text-accent-text"
            : "border-border-button bg-white text-text-primary hover:border-border-button-hover hover:bg-bg-hover",
          unavailable && "cursor-not-allowed opacity-60",
        )}
        disabled={unavailable}
        onClick={() => inputRef.current?.click()}
        type="button"
      >
        {importing ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Upload className="size-4" />
        )}
        <span>{importing ? "导入中" : "导入 Markdown"}</span>
      </button>
    </div>
  );
}


import {
  fetchFilePreviewBlob,
  fetchFilePreviewStreamUrl,
} from "@/api/file";
import type { FileListItem as FileTableRow } from "@/api/file";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import JSZip from "jszip";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  FileWarning,
  Presentation,
  Table2,
} from "lucide-react";
import mammoth from "mammoth";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  getFileExtension,
  getPreviewCategory,
  isImageFile,
  resolveFileMimeType,
  type PreviewCategory,
} from "./filePreviewUtils";

type PreviewState =
  | { mode: "idle" }
  | { mode: "loading" }
  | { mode: "image"; objectUrl: string }
  | { mode: "pdf" | "video" | "audio"; src: string }
  | { mode: "html"; html: string; note?: string }
  | { mode: "sheet"; sheets: Array<{ key: string; label: string; html: string }> }
  | { mode: "slide"; slides: string[]; note?: string }
  | { mode: "text"; text: string; note?: string }
  | { mode: "unsupported"; message: string; fallbackText?: string };

const OFFICE_PREVIEW_SIZE_LIMIT = 20 * 1024 * 1024;

const isStreamPreviewCategory = (
  category: PreviewCategory,
): category is "pdf" | "video" | "audio" =>
  category === "pdf" || category === "video" || category === "audio";

const isOfficePreviewCategory = (category: PreviewCategory) =>
  category === "word" || category === "sheet" || category === "slide";

const getRecordSize = (record: FileTableRow) => {
  if (record.kind !== "file") return 0;

  const size = Number(record.size);
  return Number.isFinite(size) ? size : 0;
};

const decodeHtml = (value: string) => {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
};

const parseDocx = async (buffer: ArrayBuffer) => {
  const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
  return {
    html: result.value || "<p>文档内容为空</p>",
    note:
      result.messages.length > 0
        ? "部分样式或内容可能在预览中被简化。"
        : undefined,
  };
};

const parseSheet = async (buffer: ArrayBuffer) => {
  const workbook = XLSX.read(buffer, { type: "array" });

  return workbook.SheetNames.map((sheetName, index) => ({
    key: `${index}-${sheetName}`,
    label: sheetName,
    html: XLSX.utils.sheet_to_html(workbook.Sheets[sheetName]),
  }));
};

const parsePptxSlides = async (buffer: ArrayBuffer) => {
  const zip = await JSZip.loadAsync(buffer);
  const slideEntries = Object.keys(zip.files)
    .filter((key) => /^ppt\/slides\/slide\d+\.xml$/.test(key))
    .sort((left, right) => {
      const leftNo = Number(left.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
      const rightNo = Number(right.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
      return leftNo - rightNo;
    });

  const slides = await Promise.all(
    slideEntries.map(async (entry) => {
      const xml = await zip.files[entry].async("string");
      const matches = Array.from(xml.matchAll(/<a:t>(.*?)<\/a:t>/g));
      const text = matches
        .map((match) => decodeHtml(match[1]))
        .join("\n")
        .trim();

      return text || "该页未提取到可显示文本";
    }),
  );

  return slides;
};

const looksBinary = (sample: Uint8Array) => {
  if (sample.length === 0) return false;

  let suspicious = 0;
  for (const byte of sample) {
    const isTab = byte === 9;
    const isLineBreak = byte === 10 || byte === 13;
    const isPrintableAscii = byte >= 32 && byte <= 126;
    if (!isTab && !isLineBreak && !isPrintableAscii) {
      suspicious += 1;
    }
  }

  return suspicious / sample.length > 0.2;
};

const readTextPreview = async (blob: Blob) => {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const sample = bytes.slice(0, Math.min(bytes.length, 512));

  if (looksBinary(sample)) {
    return null;
  }

  const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes).trim();
  return text || "文件内容为空";
};

const normalizePreviewBlob = async (
  blob: Blob,
  record: FileTableRow,
  contentType?: string,
) => {
  const resolvedType = resolveFileMimeType(record, contentType);

  if (isImageFile(record, contentType)) {
    const extension = getFileExtension(record.name);
    if (resolvedType.includes("svg") || extension === "svg") {
      const svgText = await blob.text();
      return new Blob([svgText], { type: "image/svg+xml" });
    }

    if (!blob.type && resolvedType) {
      return new Blob([blob], { type: resolvedType });
    }
  }

  return blob;
};

const FilePreviewModal = ({
  open,
  record,
  onClose,
  onDownload,
  onNext,
  onPrev,
  position,
}: {
  open: boolean;
  record: FileTableRow | null;
  onClose: () => void;
  onDownload?: (record: FileTableRow) => void;
  onNext?: () => void;
  onPrev?: () => void;
  position?: { index: number; total: number };
}) => {
  const [previewState, setPreviewState] = useState<PreviewState>({ mode: "idle" });
  const hasPrev = Boolean(onPrev) && (position ? position.index > 0 : true);
  const hasNext =
    Boolean(onNext) && (position ? position.index < position.total - 1 : true);

  const previewCategory = useMemo<PreviewCategory | null>(
    () => (record ? getPreviewCategory(record) : null),
    [record],
  );

  useEffect(() => {
    if (!open || !record || record.kind !== "file") {
      setPreviewState({ mode: "idle" });
      return;
    }

    let revokedObjectUrl: string | null = null;
    let cancelled = false;

    const cleanupObjectUrl = () => {
      if (revokedObjectUrl) {
        URL.revokeObjectURL(revokedObjectUrl);
        revokedObjectUrl = null;
      }
    };

    const setObjectState = (
      mode: Extract<PreviewState, { objectUrl: string }>["mode"],
      blob: Blob,
    ) => {
      cleanupObjectUrl();
      revokedObjectUrl = URL.createObjectURL(blob);
      if (!cancelled) {
        setPreviewState({ mode, objectUrl: revokedObjectUrl });
      }
    };

    const setTextFallback = async (blob: Blob, note?: string) => {
      const text = await readTextPreview(blob);
      if (cancelled) return;

      if (text !== null) {
        setPreviewState({ mode: "text", text, note });
        return;
      }

      setPreviewState({
        mode: "unsupported",
        message: "已尝试按文本方式预览，但当前文件内容无法被解析为可读文本。",
      });
    };

    const loadPreview = async () => {
      setPreviewState({ mode: "loading" });

      try {
        const initialCategory = getPreviewCategory(record);

        if (isStreamPreviewCategory(initialCategory)) {
          const { url } = await fetchFilePreviewStreamUrl(record._id);
          if (!cancelled) {
            setPreviewState({ mode: initialCategory, src: url });
          }
          return;
        }

        if (
          isOfficePreviewCategory(initialCategory) &&
          getRecordSize(record) > OFFICE_PREVIEW_SIZE_LIMIT
        ) {
          if (!cancelled) {
            setPreviewState({
              mode: "unsupported",
              message:
                "文件较大，暂不支持在线预览，请下载后在本地应用中查看。",
            });
          }
          return;
        }

        const { blob, contentType } = await fetchFilePreviewBlob(record._id);
        const extension = getFileExtension(record.name);
        const resolvedCategory = getPreviewCategory(record, contentType);
        const normalizedBlob = await normalizePreviewBlob(
          blob,
          record,
          contentType,
        );

        if (cancelled) return;

        switch (resolvedCategory) {
          case "image":
            setObjectState("image", normalizedBlob);
            return;
          case "pdf":
          case "video":
          case "audio":
            {
              const { url } = await fetchFilePreviewStreamUrl(record._id);
              if (!cancelled) {
                setPreviewState({ mode: resolvedCategory, src: url });
              }
            }
            return;
          case "word":
            try {
              if (extension === "docx") {
                const parsed = await parseDocx(await normalizedBlob.arrayBuffer());
                if (!cancelled) {
                  setPreviewState({ mode: "html", ...parsed });
                }
                return;
              }
            } catch {
              await setTextFallback(
                normalizedBlob,
                "文档结构化预览失败，已自动降级为文本预览。",
              );
              return;
            }

            await setTextFallback(
              normalizedBlob,
              "当前文档格式暂不支持结构化预览，已自动降级为文本预览。",
            );
            return;
          case "sheet":
            try {
              if (extension === "xlsx" || extension === "xls") {
                const sheets = await parseSheet(await normalizedBlob.arrayBuffer());
                if (!cancelled) {
                  setPreviewState(
                    sheets.length > 0
                      ? { mode: "sheet", sheets }
                      : { mode: "text", text: "工作簿内容为空" },
                  );
                }
                return;
              }
            } catch {
              await setTextFallback(
                normalizedBlob,
                "表格结构化预览失败，已自动降级为文本预览。",
              );
              return;
            }

            await setTextFallback(
              normalizedBlob,
              "当前表格格式暂不支持结构化预览，已自动降级为文本预览。",
            );
            return;
          case "slide":
            try {
              if (extension === "pptx") {
                const slides = await parsePptxSlides(
                  await normalizedBlob.arrayBuffer(),
                );
                if (!cancelled) {
                  setPreviewState({
                    mode: "slide",
                    slides,
                    note: "已提取 PPTX 中的文本内容进行预览，版式和动画不会保留。",
                  });
                }
                return;
              }
            } catch {
              await setTextFallback(
                normalizedBlob,
                "演示文稿结构化预览失败，已自动降级为文本预览。",
              );
              return;
            }

            await setTextFallback(
              normalizedBlob,
              "当前演示文稿格式暂不支持结构化预览，已自动降级为文本预览。",
            );
            return;
          case "archive":
            if (!cancelled) {
              setPreviewState({
                mode: "unsupported",
                message: "压缩包暂不支持在线解压预览。",
              });
            }
            return;
          case "text":
          case "other":
          default:
            await setTextFallback(normalizedBlob);
        }
      } catch (error) {
        if (cancelled) return;
        setPreviewState({
          mode: "unsupported",
          message:
            error instanceof Error
              ? error.message
              : "文件预览失败，请稍后重试。",
        });
      }
    };

    void loadPreview();

    return () => {
      cancelled = true;
      cleanupObjectUrl();
    };
  }, [open, record]);

  // 弹窗内用左右方向键切换同目录文件；播放器或输入控件聚焦时不触发
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.closest("input, textarea, select, [contenteditable='true']") ||
        target instanceof HTMLMediaElement
      ) {
        return;
      }
      if (event.key === "ArrowLeft" && hasPrev) onPrev?.();
      if (event.key === "ArrowRight" && hasNext) onNext?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, hasPrev, hasNext, onPrev, onNext]);

  const renderPreview = () => {
    switch (previewState.mode) {
      case "idle":
        return null;
      case "loading":
        return (
          <div className="flex h-[min(520px,60dvh)] items-center justify-center">
            <Spinner className="size-7" />
          </div>
        );
      case "image":
        return (
          <div className="flex min-h-[min(520px,60dvh)] items-center justify-center rounded-panel bg-[#f7f7f8] p-4">
            <img
              src={previewState.objectUrl}
              alt={record?.name || "preview"}
              className="max-h-[62vh] max-w-full rounded-control object-contain shadow-sm"
            />
          </div>
        );
      case "pdf":
        return (
          <iframe
            key={previewState.src}
            title={record?.name || "pdf-preview"}
            src={previewState.src}
            className="h-[70vh] w-full rounded-panel border border-[#ebecef] bg-white"
          />
        );
      case "video":
        return (
          <div className="flex min-h-[min(520px,60dvh)] items-center justify-center rounded-panel bg-black p-4">
            <video
              key={previewState.src}
              src={previewState.src}
              controls
              preload="metadata"
              className="max-h-[62vh] max-w-full rounded-control"
            />
          </div>
        );
      case "audio":
        return (
          <div className="flex min-h-[320px] items-center justify-center rounded-panel bg-[#f7f7f8]">
            <audio
              key={previewState.src}
              src={previewState.src}
              controls
              preload="metadata"
              className="w-full max-w-[560px]"
            />
          </div>
        );
      case "html":
        return (
          <div className="space-y-3">
            {previewState.note ? (
              <div className="rounded-control border border-[#e5e7eb] bg-[#fafafa] px-4 py-3 text-sm text-[#6b7280]">
                {previewState.note}
              </div>
            ) : null}
            <article
              className="prose prose-slate max-w-none rounded-panel border border-[#ebecef] bg-white px-6 py-5"
              dangerouslySetInnerHTML={{ __html: previewState.html }}
            />
          </div>
        );
      case "sheet":
        return (
          <div className="rounded-panel border border-[#ebecef] bg-white px-4 py-3">
            <Tabs defaultValue={previewState.sheets[0]?.key}>
              <TabsList>
                {previewState.sheets.map((sheet) => (
                  <TabsTrigger key={sheet.key} value={sheet.key}>{sheet.label}</TabsTrigger>
                ))}
              </TabsList>
              {previewState.sheets.map((sheet) => (
                <TabsContent key={sheet.key} value={sheet.key}>
                  <div
                    className="overflow-auto rounded-control border border-[#f1f2f4] bg-white p-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-[#ebecef] [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-[#d9dce1] [&_th]:bg-[#f7f7f8] [&_th]:px-3 [&_th]:py-2"
                    dangerouslySetInnerHTML={{ __html: sheet.html }}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </div>
        );
      case "slide":
        return (
          <div className="space-y-3">
            {previewState.note ? (
              <div className="rounded-control border border-[#e5e7eb] bg-[#fafafa] px-4 py-3 text-sm text-[#6b7280]">
                {previewState.note}
              </div>
            ) : null}
            {previewState.slides.length > 0 ? (
              previewState.slides.map((slide, index) => (
                <section
                  key={`${record?._id}-slide-${index + 1}`}
                  className="rounded-panel border border-[#ebecef] bg-white p-5"
                >
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[#6b7280]">
                    <Presentation className="size-4" />
                    第 {index + 1} 页
                  </div>
                  <pre className="whitespace-pre-wrap break-words font-sans text-[14px] leading-7 text-[#1f1f1f]">
                    {slide}
                  </pre>
                </section>
              ))
            ) : (
              <div className="rounded-panel border border-dashed border-[#d9dce1] bg-[#fafafa] px-6 py-10 text-center text-[#6b7280]">
                未提取到可预览的幻灯片文本内容
              </div>
            )}
          </div>
        );
      case "text":
        return (
          <div className="space-y-3">
            {previewState.note ? (
              <div className="rounded-control border border-[#e5e7eb] bg-[#fafafa] px-4 py-3 text-sm text-[#6b7280]">
                {previewState.note}
              </div>
            ) : null}
            <div className="overflow-auto rounded-panel border border-[#ebecef] bg-[#0f172a] p-5">
              <pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-6 text-slate-100">
                {previewState.text}
              </pre>
            </div>
          </div>
        );
      case "unsupported":
        return (
          <div className="space-y-4">
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-panel border border-dashed border-[#d9dce1] bg-[#fafafa] px-6 text-center">
              <FileWarning className="mb-4 size-10 text-[#9ca3af]" />
              <div className="text-base font-medium text-[#1f1f1f]">
                当前文件无法解析预览
              </div>
              <div className="mt-2 max-w-[520px] text-sm leading-6 text-[#6b7280]">
                {previewState.message}
              </div>
            </div>
            {previewState.fallbackText ? (
              <div className="overflow-auto rounded-panel border border-[#ebecef] bg-[#0f172a] p-5">
                <pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-6 text-slate-100">
                  {previewState.fallbackText}
                </pre>
              </div>
            ) : null}
          </div>
        );
      default:
        return null;
    }
  };

  const previewTitleIcon = () => {
    switch (previewCategory) {
      case "sheet":
        return <Table2 className="size-4 text-[#6b7280]" />;
      case "slide":
        return <Presentation className="size-4 text-[#6b7280]" />;
      default:
        return <FileText className="size-4 text-[#6b7280]" />;
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={960}
      footer={
        record ? (
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={onClose}>关闭</Button>
            <Button variant="primary" onClick={() => onDownload?.(record)}>
              下载文件
            </Button>
          </div>
        ) : null
      }
      title={
        <div className="flex min-w-0 items-center gap-2">
          {previewTitleIcon()}
          <span className="truncate">{record?.name || "文件预览"}</span>
          {position && position.total > 1 ? (
            <span className="shrink-0 text-xs font-normal tabular-nums text-text-subtle">
              {position.index + 1} / {position.total}
            </span>
          ) : null}
        </div>
      }
      className="max-h-[calc(100dvh-24px)] overflow-y-auto"
    >
      <div className="relative">
        {hasPrev ? (
          <button
            aria-label="上一个文件"
            className="absolute left-1 top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-border-button bg-bg-page text-text-primary shadow-md hover:bg-bg-hover"
            onClick={onPrev}
            type="button"
          >
            <ChevronLeft className="size-4" />
          </button>
        ) : null}
        {renderPreview()}
        {hasNext ? (
          <button
            aria-label="下一个文件"
            className="absolute right-1 top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-border-button bg-bg-page text-text-primary shadow-md hover:bg-bg-hover"
            onClick={onNext}
            type="button"
          >
            <ChevronRight className="size-4" />
          </button>
        ) : null}
      </div>
    </Modal>
  );
};

export default FilePreviewModal;

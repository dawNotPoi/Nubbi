import type { ImageOptions } from "@tiptap/extension-image";

export type ImageStatus = "placeholder" | "uploading" | "done" | "error";

export interface ImageNodeAttrs {
  alt?: string | null;
  errorMessage?: string | null;
  src?: string | null;
  status?: ImageStatus;
  title?: string | null;
  uploadId?: string | null;
}

export interface DImageOptions extends ImageOptions {
  maxFileSize?: number;
  uploadHandler?: (file: File, signal?: AbortSignal) => Promise<string>;
}

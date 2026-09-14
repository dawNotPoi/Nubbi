import type { Editor } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import type { ImageOptions } from "@tiptap/extension-image";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { ReactNodeViewRenderer } from "@tiptap/react";
import type { Command } from "@tiptap/react";
import { message } from "antd";
import ImageComponent from "./ImageComponent";

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

interface ImageUploadTask {
  abortController: AbortController;
  editor: Editor;
  previewUrl: string;
}

const imageUploadTasks = new Map<string, ImageUploadTask>();

const createUploadId = () =>
  `image-upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const getImageFiles = (files: FileList | File[]) =>
  Array.from(files).filter((file) => file.type.startsWith("image/"));

export const isValidImageUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

export const formatImageFileSize = (size: number) => {
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)}MB`;
  return `${Math.ceil(size / 1024)}KB`;
};

export const getImageFileValidationError = (
  file: File,
  maxFileSize?: number,
) => {
  if (!file.type.startsWith("image/")) return "请选择图片文件";
  if (maxFileSize && file.size > maxFileSize) {
    return `图片大小不能超过 ${formatImageFileSize(maxFileSize)}`;
  }

  return null;
};

const collectUploadIds = (editor: Editor) => {
  const uploadIds = new Set<string>();

  editor.state.doc.descendants((node) => {
    const uploadId = node.attrs.uploadId;
    if (node.type.name === "image" && typeof uploadId === "string") {
      uploadIds.add(uploadId);
    }
  });

  return uploadIds;
};

const cleanupDetachedUploadTasks = (editor: Editor) => {
  const activeUploadIds = collectUploadIds(editor);

  imageUploadTasks.forEach((task, uploadId) => {
    if (task.editor !== editor) return;
    if (activeUploadIds.has(uploadId)) return;

    task.abortController.abort();
    releaseUploadTask(uploadId);
  });
};

const releaseUploadTask = (uploadId: string) => {
  const task = imageUploadTasks.get(uploadId);
  if (!task) return;

  URL.revokeObjectURL(task.previewUrl);
  imageUploadTasks.delete(uploadId);
};

const updateImageByUploadId = (
  editor: Editor,
  uploadId: string,
  attrs: Partial<ImageNodeAttrs>,
) => {
  if (editor.isDestroyed || editor.view.isDestroyed) return false;

  let imagePosition: number | null = null;

  editor.state.doc.descendants((node, position) => {
    if (node.type.name === "image" && node.attrs.uploadId === uploadId) {
      imagePosition = position;
      return false;
    }

    return true;
  });

  if (imagePosition === null) return false;

  const node = editor.state.doc.nodeAt(imagePosition);
  if (!node) return false;

  editor.view.dispatch(
    editor.state.tr.setNodeMarkup(imagePosition, undefined, {
      ...node.attrs,
      ...attrs,
    }),
  );

  return true;
};

export const getImageUploadPreviewUrl = (uploadId?: string | null) => {
  if (!uploadId) return "";
  return imageUploadTasks.get(uploadId)?.previewUrl ?? "";
};

export const cancelImageUpload = (uploadId?: string | null, editor?: Editor) => {
  if (!uploadId) return;

  const task = imageUploadTasks.get(uploadId);
  if (editor && task?.editor !== editor) return;

  task?.abortController.abort();
  releaseUploadTask(uploadId);
};

export const startImageUpload = ({
  editor,
  file,
  maxFileSize,
  uploadHandler,
  updateAttributes,
}: {
  editor: Editor;
  file: File;
  maxFileSize?: number;
  uploadHandler?: DImageOptions["uploadHandler"];
  updateAttributes?: (attrs: Partial<ImageNodeAttrs>) => void;
}) => {
  if (!uploadHandler) return false;
  if (getImageFileValidationError(file, maxFileSize)) return false;

  const uploadId = createUploadId();
  const abortController = new AbortController();
  const previewUrl = URL.createObjectURL(file);

  imageUploadTasks.set(uploadId, { abortController, editor, previewUrl });

  const nextAttrs: Partial<ImageNodeAttrs> = {
    alt: file.name,
    errorMessage: null,
    src: null,
    status: "uploading",
    uploadId,
  };

  if (updateAttributes) {
    updateAttributes(nextAttrs);
  } else {
    const inserted = editor.commands.insertContent({
      type: "image",
      attrs: nextAttrs,
    });

    if (!inserted) {
      abortController.abort();
      releaseUploadTask(uploadId);
      return false;
    }
  }

  void uploadHandler(file, abortController.signal)
    .then((url) => {
      if (!url) throw new Error("图片上传失败");
      if (editor.isDestroyed || editor.view.isDestroyed) return;

      updateImageByUploadId(editor, uploadId, {
        errorMessage: null,
        src: url,
        status: "done",
        uploadId: null,
      });
    })
    .catch((error) => {
      if (abortController.signal.aborted) return;
      if (editor.isDestroyed || editor.view.isDestroyed) return;

      updateImageByUploadId(editor, uploadId, {
        errorMessage:
          error instanceof Error ? error.message : "图片上传失败，请重试",
        src: null,
        status: "error",
        uploadId: null,
      });
    })
    .finally(() => {
      releaseUploadTask(uploadId);
    });

  return true;
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    DImage: {
      insertImagePlaceholder: () => ReturnType;
      setImageFromUrl: (
        src: string,
        attrs?: Partial<ImageNodeAttrs>,
      ) => ReturnType;
      uploadImage: (file: File) => ReturnType;
    };
  }
}

const DImage = Image.extend<DImageOptions>({
  name: "image",

  addOptions() {
    return {
      ...Image.options,
      maxFileSize: 5 * 1024 * 1024,
      uploadHandler: async () => "",
    };
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      status: {
        default: "done",
        parseHTML: () => "done",
        renderHTML: () => ({}),
      },
      uploadId: {
        default: null,
        parseHTML: () => null,
        renderHTML: () => ({}),
      },
      errorMessage: {
        default: null,
        parseHTML: () => null,
        renderHTML: () => ({}),
      },
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute("src"),
        renderHTML: (attrs) => {
          if (!attrs.src) return {};
          return { src: attrs.src };
        },
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    const { status, src } = node.attrs;

    if (status !== "done" || !src) {
      return ["span", { "data-type": "image-placeholder" }, ""];
    }

    return ["div", ["img", HTMLAttributes]];
  },

  renderMarkdown: (node) => {
    const { alt = "", src, status, title = "" } = node.attrs ?? {};

    if (status !== "done" || !src) {
      return "";
    }

    const escapedAlt = String(alt).replace(/([\\\[\]])/g, "\\$1");
    const escapedTitle = String(title).replace(/([\\"])/g, "\\$1");

    return escapedTitle
      ? `![${escapedAlt}](${src} "${escapedTitle}")`
      : `![${escapedAlt}](${src})`;
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageComponent);
  },

  addCommands() {
    return {
      insertImagePlaceholder:
        (): Command =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              status: "placeholder",
            },
          });
        },
      setImageFromUrl:
        (src, attrs = {}): Command =>
        ({ commands }) => {
          const nextSrc = src.trim();
          if (!isValidImageUrl(nextSrc)) return false;

          return commands.insertContent({
            type: this.name,
            attrs: {
              ...attrs,
              errorMessage: null,
              src: nextSrc,
              status: "done",
              uploadId: null,
            },
          });
        },
      uploadImage:
        (file): Command =>
        () =>
          startImageUpload({
            editor: this.editor,
            file,
            maxFileSize: this.options.maxFileSize,
            uploadHandler: this.options.uploadHandler,
          }),
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("imageUploadHandler"),
        props: {
          handlePaste: (_view, event) => {
            const items = Array.from(event.clipboardData?.items || []);
            const imageFiles = items
              .filter((item) => item.type.startsWith("image/"))
              .map((item) => item.getAsFile())
              .filter((file): file is File => Boolean(file));

            if (imageFiles.length === 0) return false;

            imageFiles.forEach((file) => {
              const error = getImageFileValidationError(
                file,
                this.options.maxFileSize,
              );

              if (error) {
                message.warning(error);
                return;
              }

              this.editor.commands.uploadImage(file);
            });

            return true;
          },
          handleDrop: (view, event) => {
            const imageFiles = getImageFiles(event.dataTransfer?.files || []);
            if (imageFiles.length === 0) return false;

            event.preventDefault();

            const validFiles = imageFiles.filter((file) => {
              const error = getImageFileValidationError(
                file,
                this.options.maxFileSize,
              );

              if (error) {
                message.warning(error);
                return false;
              }

              return true;
            });

            if (validFiles.length === 0) return true;

            const dropPosition = view.posAtCoords({
              left: event.clientX,
              top: event.clientY,
            })?.pos;

            if (typeof dropPosition === "number") {
              view.dispatch(
                view.state.tr.setSelection(
                  TextSelection.create(view.state.doc, dropPosition),
                ),
              );
            }

            validFiles.forEach((file) => {
              this.editor.commands.uploadImage(file);
            });

            return true;
          },
        },
        appendTransaction: (transactions) => {
          if (transactions.some((transaction) => transaction.docChanged)) {
            cleanupDetachedUploadTasks(this.editor);
          }

          return null;
        },
        view: () => ({
          destroy: () => {
            imageUploadTasks.forEach((task, uploadId) => {
              if (task.editor !== this.editor) return;

              task.abortController.abort();
              releaseUploadTask(uploadId);
            });
          },
        }),
      }),
    ];
  },
});

export default DImage;

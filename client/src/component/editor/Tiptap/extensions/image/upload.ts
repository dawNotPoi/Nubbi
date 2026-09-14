import type { Editor } from "@tiptap/core";
import type { DImageOptions, ImageNodeAttrs } from "./types";

interface ImageUploadTask {
  abortController: AbortController;
  editor: Editor;
  previewUrl: string;
}

const imageUploadTasks = new Map<string, ImageUploadTask>();

const createUploadId = () =>
  `image-upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const isValidImageUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

export const getImageFiles = (files: FileList | File[]) =>
  Array.from(files).filter((file) => file.type.startsWith("image/"));

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

export const cleanupDetachedUploadTasks = (editor: Editor) => {
  const activeUploadIds = collectUploadIds(editor);

  imageUploadTasks.forEach((task, uploadId) => {
    if (task.editor !== editor) return;
    if (activeUploadIds.has(uploadId)) return;

    task.abortController.abort();
    releaseUploadTask(uploadId);
  });
};

export const cleanupEditorUploadTasks = (editor: Editor) => {
  imageUploadTasks.forEach((task, uploadId) => {
    if (task.editor !== editor) return;

    task.abortController.abort();
    releaseUploadTask(uploadId);
  });
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

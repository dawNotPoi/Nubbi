import Image from "@tiptap/extension-image";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { ReactNodeViewRenderer } from "@tiptap/react";
import type { Command } from "@tiptap/react";
import { message } from "antd";
import ImageComponent from "./ImageComponent";
import type { DImageOptions, ImageNodeAttrs } from "./types";
import {
  cleanupDetachedUploadTasks,
  cleanupEditorUploadTasks,
  getImageFileValidationError,
  getImageFiles,
  isValidImageUrl,
  startImageUpload,
} from "./upload";

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
            cleanupEditorUploadTasks(this.editor);
          },
        }),
      }),
    ];
  },
});

export default DImage;

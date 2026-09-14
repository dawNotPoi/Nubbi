import Image, { ImageOptions } from "@tiptap/extension-image";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Command, ReactNodeViewRenderer } from "@tiptap/react";
import ImageComponent from "./ImageComponent";
export interface DImageOptions extends ImageOptions {
  uploadHandler?: (file: File) => Promise<string>;
}

//全局command定义
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    DImage: {
      insertImagePlaceholder: () => ReturnType;
    };
  }
}
const DImage = Image.extend<DImageOptions>({
  name: "image",
  //添加外部配置
  addOptions() {
    return {
      ...Image.options,
      uploadHandler: async () => "",
    };
  },
  // 1. 添加自定义属性
  addAttributes() {
    return {
      ...this.parent?.(),
      // 上传状态: 'uploading' | 'done' | 'placeholder'
      status: {
        default: "done",
      },
      // 上传的文件对象
      file: {},
      src: {
        default: null,
        // 显式确保从 HTML/Markdown 中解析 src
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

    // 这里的返回结构决定了 Markdown 的生成
    // 使用标准的 ['img', HTMLAttributes] 才能让插件识别出这是一个 Markdown Image
    return ["div", ["img", HTMLAttributes]];
  },

  //图片组件
  addNodeView() {
    return ReactNodeViewRenderer(ImageComponent);
  },

  addCommands() {
    return {
      // 创建占位图节点的命令
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
    };
  },

  //处理粘贴事件
  addProseMirrorPlugins() {
    const { uploadHandler } = this.options;
    return [
      new Plugin({
        key: new PluginKey("imageUploadHandler"),
        props: {
          handlePaste: (view, event) => {
            const items = Array.from(event.clipboardData?.items || []);
            const imageItem = items.find((item) =>
              item.type.startsWith("image")
            );
            if (imageItem && uploadHandler) {
              const file = imageItem.getAsFile();
              if (!file) return false;

              this.editor.commands.insertContent({
                type: this.name,
                attrs: {
                  file: file,
                  status: "uploading",
                },
              });
              // 粘贴后启动上传指令
              return true; // 拦截默认粘贴行为
            }
            return false;
          },
        },
      }),
    ];
  },
});

export default DImage;

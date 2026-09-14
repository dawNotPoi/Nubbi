import { Editor } from "@tiptap/core";
import { PictureInPictureIcon } from "lucide-react";

// 编辑提示列表项
const allItems: {
  title: string;
  icon: string | JSX.Element;
  command: ({ editor, range }: { editor: Editor; range: any }) => void;
}[] = [
  {
    title: "Heading 1",
    icon: "H1",
    command: ({ editor, range }) => {
      // 删除斜杠和输入的文本，然后应用 Heading 1
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
    },
  },
  {
    title: "Heading 2",
    icon: "H2",
    command: ({ editor, range }) => {
      // 删除斜杠和输入的文本，然后应用 Heading 2
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
    },
  },
  {
    title: "Bullet List",
    icon: "•",
    command: ({ editor, range }) => {
      // 创建无序列表
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: "Code Block",
    icon: "</>",
    command: ({ editor, range }) => {
      // 插入代码块
      editor.chain().focus().deleteRange(range).setCodeBlock().run();
    },
  },
  {
    title: "Paragraph",
    icon: "P",
    command: ({ editor, range }) => {
      // 插入普通段落
      editor.chain().focus().deleteRange(range).setParagraph().run();
    },
  },
  {
    title: "Insert Image",
    icon: <PictureInPictureIcon></PictureInPictureIcon>,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertImagePlaceholder().run();
    },
  },
];

/**
 * 根据查询字符串过滤命令项
 * @param {string} context.query - 用户在斜杠后输入的文本
 * @returns {Array<Object>} 过滤后的命令列表
 */
export const getSuggestions = ({ query }: { query: any }) => {
  return allItems.filter((item) =>
    item.title.toLowerCase().startsWith(query.toLowerCase())
  );
};

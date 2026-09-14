import { Editor } from "@tiptap/core";
import {
  Code2,
  Heading1,
  Heading2,
  List,
  Pilcrow,
  PictureInPictureIcon,
} from "lucide-react";

const allItems: {
  title: string;
  description?: string;
  icon: string | JSX.Element;
  command: ({ editor, range }: { editor: Editor; range: any }) => void;
}[] = [
  {
    title: "Heading 1",
    description: "Large section heading",
    icon: <Heading1 size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
    },
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    icon: <Heading2 size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
    },
  },
  {
    title: "Bullet List",
    description: "Create a bulleted list item",
    icon: <List size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: "Inline Code",
    description: "Turn following text into inline code",
    icon: <Code2 size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setCode().run();
    },
  },
  {
    title: "Code Block",
    description: "Insert a fenced code block",
    icon: "</>",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setCodeBlock().run();
    },
  },
  {
    title: "Paragraph",
    description: "Switch back to normal text",
    icon: <Pilcrow size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setParagraph().run();
    },
  },
  {
    title: "Insert Image",
    description: "Upload or insert an image block",
    icon: <PictureInPictureIcon size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertImagePlaceholder().run();
    },
  },
];

export const getSuggestions = ({ query }: { query: string }) => {
  const normalizedQuery = query.toLowerCase().trim();

  return allItems.filter((item) =>
    normalizedQuery.length === 0
      ? true
      : item.title.toLowerCase().includes(normalizedQuery) ||
        item.description?.toLowerCase().includes(normalizedQuery),
  );
};

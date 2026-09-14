import { imgToGitCloud } from "@/api/file";
import DragHandle from "@tiptap/extension-drag-handle-react";
import { Placeholder } from "@tiptap/extensions";
import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { message } from "antd";
import clsx from "clsx";
import { Move } from "lucide-react";
import { useState } from "react";
import { CodeBlock } from "./extensions/code-block";
import image from "./extensions/image";
import { SlashCommandExtension } from "./extensions/slash-command";
import "./index.css";

const TiptapEditor = ({
  defaultValue,
  className,
  onChange,
}: {
  defaultValue?: string;
  className?: string;
  onChange?: (markdown: string) => void;
}) => {
  const [content, setContent] = useState(defaultValue || "");
  const extensions = [
    StarterKit.configure({
      codeBlock: false,
    }),
    Markdown,
    CodeBlock.configure({
      onCopy: () => {
        message.success("复制成功( •̀ ω •́ )✧");
      },
    }),
    Placeholder.configure({
      placeholder: ({ node }) => {
        if (node.type.name === "codeBlock") {
          return "";
        } else return "Write,press '/' for commands";
      },
    }),
    image.configure({
      uploadHandler: async (file) => {
        const url = await imgToGitCloud(file);
        return url;
      },
    }),

    SlashCommandExtension,
  ];

  const editor = useEditor({
    extensions: extensions,
    onUpdate: ({ editor }) => {
      const markdown = editor.getMarkdown();
      onChange?.(markdown);
    },
    content: content,
    contentType: "markdown",
  });

  return (
    <div className={clsx("size-full", className)}>
      <DragHandle
        computePositionConfig={{
          placement: "left-start",
          strategy: "fixed",
        }}
        onNodeChange={() => {}}
        editor={editor}
      >
        <div className="items-center flex h-[20px] px-2 text-zinc-400">
          <Move size={15} />
        </div>
      </DragHandle>
      <EditorContent editor={editor} />
    </div>
  );
};

export default TiptapEditor;

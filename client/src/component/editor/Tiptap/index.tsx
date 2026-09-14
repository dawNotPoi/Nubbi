import { imgToGitCloud } from "@/api/file";
import DragHandle from "@tiptap/extension-drag-handle-react";
import { Placeholder } from "@tiptap/extensions";
import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { message } from "antd";
import clsx from "clsx";
import { Move } from "lucide-react";
import { useMemo } from "react";
import { CodeBlock } from "./extensions/code-block";
import image from "./extensions/image";
import { SlashCommandExtension } from "./extensions/slash-command";
import "./index.css";

const EMPTY_DOC = {
  type: "doc",
  content: [{ type: "paragraph" }],
} as const;

const TiptapEditor = ({
  defaultValue,
  className,
  onChange,
}: {
  defaultValue?: string;
  className?: string;
  onChange?: (markdown: string) => void;
}) => {
  const extensions = [
    StarterKit.configure({
      codeBlock: false,
    }),
    Markdown,
    CodeBlock.configure({
      onCopy: () => {
        message.success("复制成功");
      },
    }),
    Placeholder.configure({
      placeholder: ({ node }) => {
        if (node.type.name === "codeBlock") {
          return "";
        }
        return "Write,press '/' for commands";
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

  const initialContent = useMemo(() => {
    const content = defaultValue?.trim() ?? "";
    if (content.length === 0) {
      return {
        content: EMPTY_DOC,
        contentType: "json" as const,
      };
    }

    return {
      content: defaultValue,
      contentType: "markdown" as const,
    };
  }, [defaultValue]);

  const editor = useEditor({
    extensions,
    onUpdate: ({ editor }) => {
      const markdown = editor.getMarkdown();
      onChange?.(markdown);
    },
    content: initialContent.content,
    contentType: initialContent.contentType,
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
        <div className="flex h-[20px] items-center px-2 text-zinc-400">
          <Move size={15} />
        </div>
      </DragHandle>
      <EditorContent editor={editor} />
    </div>
  );
};

export default TiptapEditor;

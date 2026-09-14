import { imgToGitCloud } from "@/api/file";
import DragHandle from "@tiptap/extension-drag-handle-react";
import { TableKit } from "@tiptap/extension-table";
import { Placeholder } from "@tiptap/extensions";
import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { message } from "antd";
import clsx from "clsx";
import { GripVertical } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { CodeBlock } from "./extensions/code-block";
import image from "./extensions/image";
import { ListIndentExtension } from "./extensions/list-indent";
import { SlashCommandExtension } from "./extensions/slash-command";
import { SmartSelectAllExtension } from "./extensions/smart-select-all";
import FormatBubbleMenu from "./FormatBubbleMenu";
import "./index.css";

const EMPTY_DOC = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

const TiptapEditor = ({
  defaultValue,
  className,
  onChange,
  editable = true,
  showMermaidSourceWhenReadOnly = false,
  variant = "editor",
}: {
  defaultValue?: string;
  className?: string;
  onChange?: (markdown: string) => void;
  editable?: boolean;
  showMermaidSourceWhenReadOnly?: boolean;
  variant?: "editor" | "preview";
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
      showMermaidSourceWhenReadOnly,
    }),
    TableKit.configure({
      table: {
        HTMLAttributes: {
          class: "dn-editor__table",
        },
        cellMinWidth: 120,
        lastColumnResizable: false,
        renderWrapper: true,
        resizable: true,
      },
      tableCell: {
        HTMLAttributes: {
          class: "dn-editor__table-cell",
        },
      },
      tableHeader: {
        HTMLAttributes: {
          class: "dn-editor__table-header",
        },
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
    ListIndentExtension,
    SmartSelectAllExtension,
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
  const latestContentRef = useRef(defaultValue ?? "");

  const editor = useEditor({
    extensions,
    editable,
    editorProps: {
      attributes: {
        class: "dn-editor__content",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      const markdown = currentEditor.getMarkdown();
      latestContentRef.current = markdown;
      onChange?.(markdown);
    },
    content: initialContent.content,
    contentType: initialContent.contentType,
  });

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editable, editor]);

  useEffect(() => {
    if (!editor) return;
    const nextValue = defaultValue ?? "";
    if (latestContentRef.current === nextValue) return;

    latestContentRef.current = nextValue;
    const nextContent = nextValue.trim()
      ? { content: nextValue, contentType: "markdown" as const }
      : { content: EMPTY_DOC, contentType: "json" as const };

    editor.commands.setContent(nextContent.content, {
      contentType: nextContent.contentType,
      emitUpdate: false,
    } as any);
  }, [defaultValue, editor]);

  return (
    <div
      className={clsx(
        "dn-editor size-full",
        variant === "preview" && "dn-editor--preview",
        className,
      )}
    >
      {editable && (
        <DragHandle
          computePositionConfig={{
            placement: "left-start",
            strategy: "absolute",
          }}
          onNodeChange={() => {}}
          editor={editor}
        >
          <div className="dn-editor__drag-handle flex size-8 items-center justify-center">
            <GripVertical size={18} strokeWidth={2.2} />
          </div>
        </DragHandle>
      )}
      <EditorContent editor={editor} />
      <FormatBubbleMenu editor={editor} />
    </div>
  );
};

export default TiptapEditor;

import DragHandle from "@tiptap/extension-drag-handle-react";
import { EditorContent, useEditor } from "@tiptap/react";
import clsx from "clsx";
import { GripVertical } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { EMPTY_DOC } from "./constants";
import { createExtensions } from "./extensions";
import FormatBubbleMenu from "./FormatBubbleMenu";
import { useContentSync } from "./hooks/useContentSync";
import "./index.css";
import type { TiptapEditorProps } from "./types";

const dragHandleComputePositionConfig = {
  placement: "left-start" as const,
  strategy: "absolute" as const,
};

const noopNodeChange = () => {};

const TiptapEditor = ({
  defaultValue,
  serverValue,
  canApplyExternalContent = true,
  className,
  onChange,
  editable = true,
  variant = "editor",
  onEditorReady,
}: TiptapEditorProps) => {
  const externalValue = serverValue ?? defaultValue;
  const extensions = useMemo(() => createExtensions(), []);

  const initialContent = useMemo(() => {
    const content = externalValue?.trim() ?? "";
    if (content.length === 0) {
      return {
        content: EMPTY_DOC,
        contentType: "json" as const,
      };
    }

    return {
      content: externalValue,
      contentType: "markdown" as const,
    };
  }, [externalValue]);

  const contentRef = useRef(externalValue ?? "");

  const editor = useEditor({
    extensions,
    editable,
    editorProps: {
      attributes: {
        autocapitalize: "off",
        autocorrect: "off",
        class: "dn-editor__content",
        spellcheck: "false",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      const markdown = currentEditor.getMarkdown();
      contentRef.current = markdown;
      onChange?.(markdown);
    },
    content: initialContent.content,
    contentType: initialContent.contentType,
  });

  useContentSync(
    editor,
    externalValue,
    contentRef,
    canApplyExternalContent,
  );

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editable, editor]);

  useEffect(() => {
    if (editor) onEditorReady?.(editor);
  }, [editor, onEditorReady]);

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
          computePositionConfig={dragHandleComputePositionConfig}
          onNodeChange={noopNodeChange}
          editor={editor}
        >
          <div className="dn-editor__drag-handle flex size-8 items-center justify-center">
            <GripVertical size={18} strokeWidth={2.2} />
          </div>
        </DragHandle>
      )}
      <EditorContent editor={editor} />
      {editable && <FormatBubbleMenu editor={editor} />}
    </div>
  );
};

export default TiptapEditor;

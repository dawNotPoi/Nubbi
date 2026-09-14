import type { Editor } from "@tiptap/react";

export type TiptapEditorVariant = "editor" | "preview";

export interface TiptapEditorProps {
  defaultValue?: string;
  serverValue?: string;
  canApplyExternalContent?: boolean;
  className?: string;
  onChange?: (markdown: string) => void;
  editable?: boolean;
  showMermaidSourceWhenReadOnly?: boolean;
  variant?: TiptapEditorVariant;
  showTOC?: boolean;
  onEditorReady?: (editor: Editor) => void;
}

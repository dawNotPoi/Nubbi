import type { Editor } from "@tiptap/react";

export type TiptapEditorVariant = "editor" | "preview";

export interface TiptapEditorProps {
  defaultValue?: string;
  serverValue?: string;
  canApplyExternalContent?: boolean;
  className?: string;
  onChange?: (markdown: string) => void;
  editable?: boolean;
  variant?: TiptapEditorVariant;
  onEditorReady?: (editor: Editor) => void;
}

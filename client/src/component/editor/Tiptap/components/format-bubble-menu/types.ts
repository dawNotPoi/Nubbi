import type { Editor } from "@tiptap/core";

export interface FormatBubbleMenuState {
  canAddColumnAfter: boolean;
  canAddColumnBefore: boolean;
  canAddRowAfter: boolean;
  canAddRowBefore: boolean;
  canDeleteColumn: boolean;
  canDeleteRow: boolean;
  canDeleteTable: boolean;
  canIndent: boolean;
  canMergeCells: boolean;
  canOutdent: boolean;
  canSplitCell: boolean;
  isBlockquote: boolean;
  isBold: boolean;
  isBulletList: boolean;
  isCode: boolean;
  isHeading1: boolean;
  isHeading2: boolean;
  isHeading3: boolean;
  isInTable: boolean;
  isItalic: boolean;
  isOrderedList: boolean;
  isParagraph: boolean;
  isStrike: boolean;
  isTableHeader: boolean;
}

export interface EditorMenuProps {
  editor: Editor;
  state: FormatBubbleMenuState | null;
}

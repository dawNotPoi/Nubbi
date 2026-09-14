import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import TableMenu from "./components/format-bubble-menu/TableMenu";
import TextFormatMenu from "./components/format-bubble-menu/TextFormatMenu";

type FormatBubbleMenuProps = {
  editor: Editor | null | undefined;
};

const FormatBubbleMenu = ({ editor }: FormatBubbleMenuProps) => {
  const state = useEditorState({
    editor: editor ?? null,
    selector: ({ editor: currentEditor }) => ({
      isBold: currentEditor?.isActive("bold") ?? false,
      isItalic: currentEditor?.isActive("italic") ?? false,
      isStrike: currentEditor?.isActive("strike") ?? false,
      isCode: currentEditor?.isActive("code") ?? false,
      isParagraph: currentEditor?.isActive("paragraph") ?? false,
      isHeading1: currentEditor?.isActive("heading", { level: 1 }) ?? false,
      isHeading2: currentEditor?.isActive("heading", { level: 2 }) ?? false,
      isHeading3: currentEditor?.isActive("heading", { level: 3 }) ?? false,
      isBulletList: currentEditor?.isActive("bulletList") ?? false,
      isOrderedList: currentEditor?.isActive("orderedList") ?? false,
      isBlockquote: currentEditor?.isActive("blockquote") ?? false,
      isInTable: currentEditor?.isActive("table") ?? false,
      isTableHeader: currentEditor?.isActive("tableHeader") ?? false,
      canIndent:
        currentEditor?.can().chain().focus().sinkListItem("listItem").run() ??
        false,
      canOutdent:
        currentEditor?.can().chain().focus().liftListItem("listItem").run() ??
        false,
      canAddColumnBefore:
        currentEditor?.can().chain().focus().addColumnBefore().run() ?? false,
      canAddColumnAfter:
        currentEditor?.can().chain().focus().addColumnAfter().run() ?? false,
      canDeleteColumn:
        currentEditor?.can().chain().focus().deleteColumn().run() ?? false,
      canAddRowBefore:
        currentEditor?.can().chain().focus().addRowBefore().run() ?? false,
      canAddRowAfter:
        currentEditor?.can().chain().focus().addRowAfter().run() ?? false,
      canDeleteRow:
        currentEditor?.can().chain().focus().deleteRow().run() ?? false,
      canMergeCells:
        currentEditor?.can().chain().focus().mergeCells().run() ?? false,
      canSplitCell:
        currentEditor?.can().chain().focus().splitCell().run() ?? false,
      canDeleteTable:
        currentEditor?.can().chain().focus().deleteTable().run() ?? false,
    }),
  });

  if (!editor) {
    return null;
  }

  return (
    <>
      <BubbleMenu
        editor={editor}
        appendTo={() => document.body}
        shouldShow={({ state: currentState }) => {
          const { empty, $from } = currentState.selection;
          return !empty && $from.parent.type.name !== "codeBlock";
        }}
        options={{
          placement: "top",
          offset: 10,
          flip: true,
          shift: { padding: 12 },
        }}
        className="dn-editor__bubble-menu"
      >
        <TextFormatMenu editor={editor} state={state} />
      </BubbleMenu>

      <BubbleMenu
        editor={editor}
        appendTo={() => document.body}
        shouldShow={({ editor: currentEditor }) =>
          currentEditor.isEditable && currentEditor.isActive("table")
        }
        options={{
          placement: "bottom",
          offset: 10,
          flip: true,
          shift: { padding: 12 },
        }}
        className="dn-editor__bubble-menu"
      >
        <TableMenu editor={editor} state={state} />
      </BubbleMenu>
    </>
  );
};

export default FormatBubbleMenu;

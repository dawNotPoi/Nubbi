import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import clsx from "clsx";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bold,
  Code2,
  Columns4,
  Heading1,
  Heading2,
  Heading3,
  IndentDecrease,
  IndentIncrease,
  Italic,
  List,
  ListOrdered,
  PanelLeft,
  PanelTop,
  Pilcrow,
  Quote,
  Rows4,
  Strikethrough,
  TableCellsMerge,
  TableCellsSplit,
  Trash2,
} from "lucide-react";
import type { ReactNode } from "react";

type FormatBubbleMenuProps = {
  editor: Editor | null | undefined;
};

type MenuButtonProps = {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
};

const MenuButton = ({
  label,
  active,
  disabled,
  onClick,
  children,
}: MenuButtonProps) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    aria-pressed={active}
    disabled={disabled}
    onMouseDown={(event) => event.preventDefault()}
    onClick={onClick}
    className={clsx(
      "flex size-8 items-center justify-center rounded-md border transition-colors disabled:cursor-not-allowed disabled:opacity-35",
      active
        ? "border-[rgba(55,53,47,0.18)] bg-[rgba(55,53,47,0.08)] text-[rgba(55,53,47,0.92)]"
        : "border-transparent bg-transparent text-[rgba(55,53,47,0.68)] hover:border-[rgba(55,53,47,0.12)] hover:bg-[rgba(55,53,47,0.05)] hover:text-[rgba(55,53,47,0.9)]",
    )}
  >
    {children}
  </button>
);

const StackedIcon = ({ children }: { children: ReactNode }) => (
  <span className="relative flex size-5 items-center justify-center">
    {children}
  </span>
);

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
        <div className="flex items-center gap-0.5">
          <MenuButton
            label="加粗"
            active={state?.isBold}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold size={16} />
          </MenuButton>
          <MenuButton
            label="斜体"
            active={state?.isItalic}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic size={16} />
          </MenuButton>
          <MenuButton
            label="删除线"
            active={state?.isStrike}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <Strikethrough size={16} />
          </MenuButton>
          <MenuButton
            label="行内代码"
            active={state?.isCode}
            onClick={() => editor.chain().focus().toggleCode().run()}
          >
            <Code2 size={16} />
          </MenuButton>
          <div className="mx-1 h-5 w-px bg-[rgba(55,53,47,0.12)]" />
          <MenuButton
            label="正文"
            active={state?.isParagraph}
            onClick={() => editor.chain().focus().setParagraph().run()}
          >
            <Pilcrow size={16} />
          </MenuButton>
          <MenuButton
            label="标题一"
            active={state?.isHeading1}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
          >
            <Heading1 size={16} />
          </MenuButton>
          <MenuButton
            label="标题二"
            active={state?.isHeading2}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            <Heading2 size={16} />
          </MenuButton>
          <MenuButton
            label="标题三"
            active={state?.isHeading3}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
          >
            <Heading3 size={16} />
          </MenuButton>
          <div className="mx-1 h-5 w-px bg-[rgba(55,53,47,0.12)]" />
          <MenuButton
            label="无序列表"
            active={state?.isBulletList}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List size={16} />
          </MenuButton>
          <MenuButton
            label="有序列表"
            active={state?.isOrderedList}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered size={16} />
          </MenuButton>
          <MenuButton
            label="引用"
            active={state?.isBlockquote}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <Quote size={16} />
          </MenuButton>
          <div className="mx-1 h-5 w-px bg-[rgba(55,53,47,0.12)]" />
          <MenuButton
            label="缩进"
            disabled={!state?.canIndent}
            onClick={() => editor.chain().focus().sinkListItem("listItem").run()}
          >
            <IndentIncrease size={16} />
          </MenuButton>
          <MenuButton
            label="取消缩进"
            disabled={!state?.canOutdent}
            onClick={() => editor.chain().focus().liftListItem("listItem").run()}
          >
            <IndentDecrease size={16} />
          </MenuButton>
        </div>
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
        <div className="flex items-center gap-0.5">
          <MenuButton
            label="向上插入行"
            disabled={!state?.canAddRowBefore}
            onClick={() => editor.chain().focus().addRowBefore().run()}
          >
            <StackedIcon>
              <Rows4 size={16} />
              <ArrowUp className="absolute -right-1 -top-1" size={10} />
            </StackedIcon>
          </MenuButton>
          <MenuButton
            label="向下插入行"
            disabled={!state?.canAddRowAfter}
            onClick={() => editor.chain().focus().addRowAfter().run()}
          >
            <StackedIcon>
              <Rows4 size={16} />
              <ArrowDown className="absolute -bottom-1 -right-1" size={10} />
            </StackedIcon>
          </MenuButton>
          <MenuButton
            label="删除当前行"
            disabled={!state?.canDeleteRow}
            onClick={() => editor.chain().focus().deleteRow().run()}
          >
            <Trash2 size={16} />
          </MenuButton>
          <div className="mx-1 h-5 w-px bg-[rgba(55,53,47,0.12)]" />
          <MenuButton
            label="向左插入列"
            disabled={!state?.canAddColumnBefore}
            onClick={() => editor.chain().focus().addColumnBefore().run()}
          >
            <StackedIcon>
              <Columns4 size={16} />
              <ArrowLeft className="absolute -left-1 -top-1" size={10} />
            </StackedIcon>
          </MenuButton>
          <MenuButton
            label="向右插入列"
            disabled={!state?.canAddColumnAfter}
            onClick={() => editor.chain().focus().addColumnAfter().run()}
          >
            <StackedIcon>
              <Columns4 size={16} />
              <ArrowRight className="absolute -right-1 -top-1" size={10} />
            </StackedIcon>
          </MenuButton>
          <MenuButton
            label="删除当前列"
            disabled={!state?.canDeleteColumn}
            onClick={() => editor.chain().focus().deleteColumn().run()}
          >
            <Trash2 size={16} />
          </MenuButton>
          <div className="mx-1 h-5 w-px bg-[rgba(55,53,47,0.12)]" />
          <MenuButton
            label="切换表头行"
            active={state?.isTableHeader}
            disabled={!state?.isInTable}
            onClick={() => editor.chain().focus().toggleHeaderRow().run()}
          >
            <PanelTop size={16} />
          </MenuButton>
          <MenuButton
            label="切换表头列"
            disabled={!state?.isInTable}
            onClick={() => editor.chain().focus().toggleHeaderColumn().run()}
          >
            <PanelLeft size={16} />
          </MenuButton>
          <MenuButton
            label="合并单元格"
            disabled={!state?.canMergeCells}
            onClick={() => editor.chain().focus().mergeCells().run()}
          >
            <TableCellsMerge size={16} />
          </MenuButton>
          <MenuButton
            label="拆分单元格"
            disabled={!state?.canSplitCell}
            onClick={() => editor.chain().focus().splitCell().run()}
          >
            <TableCellsSplit size={16} />
          </MenuButton>
          <div className="mx-1 h-5 w-px bg-[rgba(55,53,47,0.12)]" />
          <MenuButton
            label="删除表格"
            disabled={!state?.canDeleteTable}
            onClick={() => editor.chain().focus().deleteTable().run()}
          >
            <Trash2 size={16} />
          </MenuButton>
        </div>
      </BubbleMenu>
    </>
  );
};

export default FormatBubbleMenu;

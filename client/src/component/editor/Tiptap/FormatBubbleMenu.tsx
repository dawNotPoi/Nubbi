import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import clsx from "clsx";
import {
  Bold,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  IndentDecrease,
  IndentIncrease,
  Italic,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  Strikethrough,
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
      canIndent:
        currentEditor?.can().chain().focus().sinkListItem("listItem").run() ??
        false,
      canOutdent:
        currentEditor?.can().chain().focus().liftListItem("listItem").run() ??
        false,
    }),
  });

  if (!editor) {
    return null;
  }

  return (
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
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 size={16} />
        </MenuButton>
        <MenuButton
          label="标题二"
          active={state?.isHeading2}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 size={16} />
        </MenuButton>
        <MenuButton
          label="标题三"
          active={state?.isHeading3}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
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
  );
};

export default FormatBubbleMenu;

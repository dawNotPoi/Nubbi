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
import MenuButton from "./MenuButton";
import type { EditorMenuProps } from "./types";

const Separator = () => (
  <div className="mx-1 h-5 w-px bg-[rgba(55,53,47,0.12)]" />
);

const TextFormatMenu = ({ editor, state }: EditorMenuProps) => (
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
    <Separator />
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
    <Separator />
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
    <Separator />
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
);

export default TextFormatMenu;

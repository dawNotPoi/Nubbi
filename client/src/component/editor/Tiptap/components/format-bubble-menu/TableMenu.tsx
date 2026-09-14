import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Columns4,
  PanelLeft,
  PanelTop,
  Rows4,
  TableCellsMerge,
  TableCellsSplit,
  Trash2,
} from "lucide-react";
import MenuButton from "./MenuButton";
import StackedIcon from "./StackedIcon";
import type { EditorMenuProps } from "./types";

const Separator = () => (
  <div className="mx-1 h-5 w-px bg-[rgba(55,53,47,0.12)]" />
);

const TableMenu = ({ editor, state }: EditorMenuProps) => (
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
    <Separator />
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
    <Separator />
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
    <Separator />
    <MenuButton
      label="删除表格"
      disabled={!state?.canDeleteTable}
      onClick={() => editor.chain().focus().deleteTable().run()}
    >
      <Trash2 size={16} />
    </MenuButton>
  </div>
);

export default TableMenu;

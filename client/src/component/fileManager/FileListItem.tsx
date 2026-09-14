import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  FileOutlined,
  FolderOpenOutlined,
} from "@ant-design/icons";
import { Button, Checkbox, Dropdown, Typography } from "antd";
import type { MenuProps } from "antd";
import dayjs from "dayjs";
import type { FileEntry, FolderEntry } from "./types";

export function FolderListItem({
  folder,
  onOpen,
}: {
  folder: FolderEntry;
  onOpen: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded hover:bg-zinc-50">
      <FolderOpenOutlined className="text-zinc-500" />
      <button
        type="button"
        className="flex-1 text-left truncate"
        onClick={onOpen}
        title={folder.name}
      >
        <Typography.Text>{folder.name}</Typography.Text>
      </button>
      <Typography.Text type="secondary">{folder.fileCount} 项</Typography.Text>
    </div>
  );
}

export function FileListItem({
  entry,
  selected,
  onToggleSelect,
  onDownload,
  onRename,
  onDelete,
  onCopyLink,
}: {
  entry: FileEntry;
  selected: boolean;
  onToggleSelect: () => void;
  onDownload: () => void;
  onRename: () => void;
  onDelete: () => void;
  onCopyLink: () => void;
}) {
  const menuItems: MenuProps["items"] = [
    { key: "rename", icon: <EditOutlined />, label: "重命名", onClick: onRename },
    {
      key: "copy",
      icon: <CopyOutlined />,
      label: "复制链接",
      onClick: onCopyLink,
    },
    {
      key: "delete",
      icon: <DeleteOutlined />,
      danger: true,
      label: "删除",
      onClick: onDelete,
    },
  ];

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded hover:bg-zinc-50">
      <Checkbox checked={selected} onChange={onToggleSelect} />
      <FileOutlined className="text-zinc-500" />
      <button
        type="button"
        className="flex-1 text-left truncate"
        onClick={onDownload}
        title={entry.fullName}
      >
        <Typography.Text>{entry.baseName}</Typography.Text>
      </button>
      <Typography.Text type="secondary" className="hidden sm:block">
        {dayjs(entry.file.updatedAt).format("YYYY-MM-DD")}
      </Typography.Text>
      <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
        <Button size="small">操作</Button>
      </Dropdown>
    </div>
  );
}


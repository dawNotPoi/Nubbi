import type { FileListData, FolderRecord } from "@/api/file";
import { formatFileSize } from "@/utils/common";
import { Button, Checkbox, Empty, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import FileActions from "./FileActions";
import { getFileTypeIcon, type FileTableRow } from "./fileIcons";

const FileListTable = ({
  list,
  onOpenFolder,
  isLoading = false,
  onDownload,
  onShare,
  onMove,
  onMore,
}: {
  list?: FileListData;
  onOpenFolder: (folder: FolderRecord) => void;
  isLoading: boolean;
  onDownload?: (record: FileTableRow) => void;
  onShare?: (record: FileTableRow) => void;
  onMove?: (record: FileTableRow) => void;
  onMore?: (record: FileTableRow) => void;
}) => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  const dataSource: FileTableRow[] = [
    ...(list?.folders?.map((folder) => ({
      ...folder,
      kind: "folder" as const,
    })) ?? []),
    ...(list?.files?.map((file) => ({ ...file, kind: "file" as const })) ?? []),
  ];

  const allRowKeys = useMemo(
    () => dataSource.map((record) => record._id),
    [dataSource],
  );

  useEffect(() => {
    setSelectedRowKeys((prev) =>
      prev.filter((key) => allRowKeys.includes(String(key))),
    );
  }, [allRowKeys]);

  const isAllSelected = allRowKeys.length > 0 && selectedRowKeys.length === allRowKeys.length;
  const isIndeterminate =
    selectedRowKeys.length > 0 && selectedRowKeys.length < allRowKeys.length;

  const handleToggleAll = (checked: boolean) => {
    setSelectedRowKeys(checked ? allRowKeys : []);
  };

  const handleToggleRow = (checked: boolean, rowKey: string) => {
    setSelectedRowKeys((prev) => {
      if (checked) {
        return prev.includes(rowKey) ? prev : [...prev, rowKey];
      }

      return prev.filter((key) => key !== rowKey);
    });
  };

  const columns: ColumnsType<FileTableRow> = [
    {
      title: (
        <Checkbox
          checked={isAllSelected}
          indeterminate={isIndeterminate}
          onChange={(event) => handleToggleAll(event.target.checked)}
        />
      ),
      dataIndex: "selector",
      width: 56,
      render: (_value, record) => (
        <Checkbox
          checked={selectedRowKeys.includes(record._id)}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => handleToggleRow(event.target.checked, record._id)}
        />
      ),
    },
    {
      title: "文件名",
      dataIndex: "name",
      ellipsis: true,
      render: (_value, record) => {
        const isFolder = record.kind === "folder";

        return (
          <div className="group flex items-center gap-3 min-w-0">
            {getFileTypeIcon(record)}
            <Button
              type="link"
              className="px-0 text-sm"
              title={record.name}
              onClick={(event) => {
                event.stopPropagation();
                if (isFolder) onOpenFolder(record);
              }}
            >
              <span className="truncate">{record.name}</span>
            </Button>
            <FileActions
              record={record}
              onDownload={onDownload}
              onShare={onShare}
              onMove={onMove}
              onMore={onMore}
            />
          </div>
        );
      },
    },
    {
      title: "大小",
      dataIndex: "size",
      width: 160,
      responsive: ["md"],
      render: (size, record) =>
        record.kind === "folder" ? "--" : formatFileSize(Number(size)),
    },
    {
      title: "修改时间",
      dataIndex: "updatedAt",
      width: 220,
      responsive: ["lg"],
      render: (value?: string) =>
        value ? dayjs(value).format("YYYY-MM-DD HH:mm") : "--",
    },
  ];

  return (
    <Table<FileTableRow>
      loading={isLoading}
      rowKey={(record) => record._id}
      columns={columns}
      dataSource={dataSource}
      pagination={false}
      size="middle"
      locale={{ emptyText: <Empty description="暂无文件" /> }}
      onRow={(record) => ({
        className: "cursor-pointer",
        onDoubleClick: () => {
          if (record.kind === "folder") onOpenFolder(record);
        },
      })}
    />
  );
};

export default FileListTable;

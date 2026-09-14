import type { FileListData, FolderRecord } from "@/api/file";
import { formatFileSize } from "@/utils/common";
import type { InputRef } from "antd";
import { Button, Checkbox, Empty, Input, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useEffect, useMemo, useRef, useState } from "react";
import FileActions from "./FileActions";
import { getFileTypeIcon, type FileTableRow } from "./fileIcons";

const FileListTable = ({
  list,
  onOpenFolder,
  isLoading = false,
  selectedRowKeys,
  onSelectedRowKeysChange,
  onPreview,
  onDownload,
  onShare,
  onMove,
  onRename,
  onDelete,
}: {
  list?: FileListData;
  onOpenFolder: (folder: FolderRecord) => void;
  isLoading: boolean;
  selectedRowKeys?: string[];
  onSelectedRowKeysChange?: (keys: string[], rows: FileTableRow[]) => void;
  onPreview?: (record: FileTableRow) => void;
  onDownload?: (record: FileTableRow) => void;
  onShare?: (record: FileTableRow) => void;
  onMove?: (record: FileTableRow) => void;
  onRename?: (record: FileTableRow, name: string) => Promise<boolean> | boolean;
  onDelete?: (record: FileTableRow) => void;
}) => {
  const [internalSelectedRowKeys, setInternalSelectedRowKeys] = useState<string[]>(
    [],
  );
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [savingRename, setSavingRename] = useState(false);
  const inputRef = useRef<InputRef>(null);

  const dataSource = useMemo<FileTableRow[]>(
    () => [
      ...(list?.folders?.map((folder) => ({
        ...folder,
        kind: "folder" as const,
      })) ?? []),
      ...(list?.files?.map((file) => ({ ...file, kind: "file" as const })) ??
        []),
    ],
    [list?.files, list?.folders],
  );

  const allRowKeys = useMemo(
    () => dataSource.map((record) => record._id),
    [dataSource],
  );
  const resolvedSelectedRowKeys = selectedRowKeys ?? internalSelectedRowKeys;

  const updateSelectedRowKeys = (keys: string[]) => {
    if (selectedRowKeys === undefined) {
      setInternalSelectedRowKeys(keys);
    }

    const keySet = new Set(keys);
    const selectedRows = dataSource.filter((record) => keySet.has(record._id));
    onSelectedRowKeysChange?.(keys, selectedRows);
  };

  useEffect(() => {
    const next = resolvedSelectedRowKeys.filter((key) =>
      allRowKeys.includes(String(key)),
    );
    if (
      next.length === resolvedSelectedRowKeys.length &&
      next.every((key, index) => key === resolvedSelectedRowKeys[index])
    ) {
      return;
    }

    updateSelectedRowKeys(next);
  }, [allRowKeys, resolvedSelectedRowKeys]);

  useEffect(() => {
    if (!editingRecordId) return;
    inputRef.current?.focus({
      cursor: "all",
    });
  }, [editingRecordId]);

  const isAllSelected =
    allRowKeys.length > 0 && resolvedSelectedRowKeys.length === allRowKeys.length;
  const isIndeterminate =
    resolvedSelectedRowKeys.length > 0 &&
    resolvedSelectedRowKeys.length < allRowKeys.length;

  const handleToggleAll = (checked: boolean) => {
    updateSelectedRowKeys(checked ? allRowKeys : []);
  };

  const handleToggleRow = (checked: boolean, rowKey: string) => {
    const next = checked
      ? resolvedSelectedRowKeys.includes(rowKey)
        ? resolvedSelectedRowKeys
        : [...resolvedSelectedRowKeys, rowKey]
      : resolvedSelectedRowKeys.filter((key) => key !== rowKey);

    updateSelectedRowKeys(next);
  };

  const handleSelectRow = (rowKey: string) => {
    updateSelectedRowKeys([rowKey]);
  };

  const handleOpenRecord = (record: FileTableRow) => {
    if (record.kind === "folder") {
      onOpenFolder(record);
      return;
    }

    onPreview?.(record);
  };

  const startRename = (record: FileTableRow) => {
    setEditingRecordId(record._id);
    setEditingValue(record.name || "");
  };

  const cancelRename = () => {
    setEditingRecordId(null);
    setEditingValue("");
    setSavingRename(false);
  };

  const submitRename = async (record: FileTableRow) => {
    const nextName = editingValue.trim();
    if (!nextName || nextName === record.name || !onRename) {
      cancelRename();
      return;
    }

    setSavingRename(true);
    const success = await onRename(record, nextName);
    if (success) {
      cancelRename();
      return;
    }

    setSavingRename(false);
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
          checked={resolvedSelectedRowKeys.includes(record._id)}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) =>
            handleToggleRow(event.target.checked, record._id)
          }
        />
      ),
    },
    {
      title: "文件名",
      dataIndex: "name",
      ellipsis: true,
      render: (_value, record) => {
        const isEditing = editingRecordId === record._id;

        return (
          <div className="group flex items-center gap-3 min-w-0">
            {getFileTypeIcon(record)}
            {isEditing ? (
              <Input
                ref={inputRef}
                value={editingValue}
                size="small"
                disabled={savingRename}
                className="max-w-[240px]"
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => setEditingValue(event.target.value)}
                onPressEnter={() => void submitRename(record)}
                onBlur={() => {
                  if (!savingRename) {
                    cancelRename();
                  }
                }}
              />
            ) : (
              <Button
                type="link"
                className="px-0 text-sm"
                title={record.name}
                onClick={(event) => {
                  event.stopPropagation();
                  handleSelectRow(record._id);
                }}
                onDoubleClick={(event) => {
                  event.stopPropagation();
                  handleOpenRecord(record);
                }}
              >
                <span className="truncate">{record.name}</span>
              </Button>
            )}
            <FileActions
              record={record}
              onDownload={onDownload}
              onShare={onShare}
              onMove={onMove}
              onRename={startRename}
              onDelete={onDelete}
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
        className: [
          "cursor-pointer",
          resolvedSelectedRowKeys.includes(record._id)
            ? "[&>td]:!bg-[#f5f5f5]"
            : "",
        ].join(" "),
        onClick: () => handleSelectRow(record._id),
        onDoubleClick: () => {
          handleOpenRecord(record);
        },
      })}
    />
  );
};

export default FileListTable;

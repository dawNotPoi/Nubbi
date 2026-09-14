import { getFiles, renameFile } from "@/api/file";
import { useGlobalUpload } from "@/component/upload/hooks/GlobalUpload";
import UploadListWrapper from "@/component/upload/UploadListWrapper";
import { deleteFileAtom, getFilesAtom } from "@/store/atom/FileAtom";
import {
  Button,
  Input,
  message,
  Modal,
  Popconfirm,
  Table,
  TableColumnsType,
  TableProps,
  Upload,
} from "antd";
import dayjs from "dayjs";
import { useAtomValue } from "jotai";
import { useMemo, useRef, useState } from "react";

interface DataType {
  _id: string;
  name: string;
  type: string;
  updatedAt: string;
  path: string;
}

const FileManager = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const selected = useRef<DataType[]>();
  const [open, setOpen] = useState(false);
  const [renameShow, setRenameShow] = useState(false);
  const { data, isLoading, refetch } = useAtomValue(getFilesAtom);
  const deleteFileMutation = useAtomValue(deleteFileAtom);
  const deleteFile = (id: string) => {
    deleteFileMutation.mutate(id, {
      onSuccess: () => {
        messageApi.success("删除成功");
      },
    });
  };
  const [rename, setRename] = useState({
    _id: "",
    name: "",
  });
  const { createUploadTask } = useGlobalUpload();
  const rowSelection: TableProps<DataType>["rowSelection"] = {
    onChange: (selectedRowKeys: React.Key[], selectedRows: DataType[]) => {
      console.log(
        `selectedRowKeys: ${selectedRowKeys}`,
        "selectedRows: ",
        selectedRows
      );
      selected.current = selectedRows;
    },
    getCheckboxProps: (record: DataType) => ({
      disabled: record.name === "Disabled User",
      name: record.name,
    }),
  };
  const columns: TableColumnsType<DataType> = useMemo(
    () => [
      {
        title: "文件名",
        dataIndex: "name",
        render: (text: string, data) => {
          return (
            <a download href={data.path}>
              {text}
            </a>
          );
        },
      },
      {
        title: "类型",
        dataIndex: "type",
        render: (type: string) => <span>{type || "未知"}</span>,
      },
      {
        title: "修改日期",
        dataIndex: "updatedAt",
        render: (text: string) => (
          <span>{dayjs(text).format("YYYY-MM-DD")}</span>
        ),
      },
      {
        title: "",
        dataIndex: "",
        render: (text: string, item) => (
          <span className="flex gap-2">
            <Button
              onClick={() => {
                setRename({
                  _id: item._id,
                  name: item.name,
                });
                setRenameShow(true);
              }}
            >
              重命名
            </Button>
            <Button
              onClick={async () => {
                deleteFile(item._id);
              }}
            >
              删除
            </Button>
            <Button
              onClick={async () => {
                window.navigator.clipboard.writeText(item.path);
                messageApi.success("复制成功");
              }}
            >
              分享
            </Button>
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div>
      {contextHolder}
      <Modal
        title="重命名"
        open={renameShow}
        onOk={async () => {
          const res = await renameFile(rename._id, rename.name);
          if (res.code == 1) {
            refetch();
            messageApi.success("重命名成功");
            setRenameShow(false);
          }
        }}
        onCancel={() => {
          setRenameShow(false);
        }}
      >
        <Input
          value={rename.name}
          onChange={(e) => setRename({ ...rename, name: e.target.value })}
        ></Input>
      </Modal>
      <header className="flex gap-4">
        <Upload
          showUploadList={false}
          customRequest={(file) => {
            const item = file.file as File;
            console.log(item);
            if (!item) return;
            createUploadTask(item);
            setOpen(true);
          }}
        >
          <Button type="primary">上传</Button>
        </Upload>
        <Popconfirm
          title="删除文件"
          description="确认删除所有选中文件?"
          onConfirm={() => {
            console.log(selected.current?.map((item) => item._id));
            Promise.all(
              selected.current?.map((item) => {
                return deleteFile(item._id);
              }) || []
            )
              .then(getFiles)
              .then(() => message.success("删除成功"));
          }}
          onCancel={() => {}}
          okText="Yes"
          cancelText="No"
        >
          <Button danger>删除</Button>
        </Popconfirm>

        <Button>新建文件夹</Button>
        <Button
          onClick={() => {
            setOpen(true);
          }}
        >
          上传列表
        </Button>
      </header>
      <section className="h-full mb-20 space-y-4 pt-4">
        <Table<DataType>
          rowSelection={{ type: "checkbox", ...rowSelection }}
          columns={columns}
          dataSource={data || []}
          rowKey={(item) => item._id}
          loading={isLoading}
        />
      </section>
      <UploadListWrapper open={open} onClose={() => setOpen(false)} />
    </div>
  );
};
export default FileManager;

import MarkdownUpload from "@/component/upload/MarkdownUpload";
import { Button, DatePicker, Table, Tag } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function NoteTable() {
  const [data] = useState([]);
  const [hoveredRowKey, setHoveredRowKey] = useState(null);
  const colums = [
    {
      title: "title",
      dataIndex: "title",
      key: "title",
      render: (_: any, { _id, title }: any) => {
        return (
          <div>
            {title}
            {hoveredRowKey === _id && (
              <Button
                style={{
                  position: "absolute",
                  top: "10px",
                  right: "3px",
                }}
                onClick={() => {
                  navigate(`/note/${_id}`);
                }}
              >
                open
              </Button>
            )}
          </div>
        );
      },
    },
    {
      title: "status",
      dataIndex: "status",
      key: "status",
    },
    {
      title: "date",
      dataIndex: "date",
      key: "date",
      render: (_: any, { date }: any) => {
        return <DatePicker defaultValue={dayjs(date)} format={"YYYY-MM-DD"} />;
      },
    },
    {
      title: "Tags",
      dataIndex: "tags",
      key: "tags",
      render: (_: any, { tags }: any) => (
        <>
          {tags.map((tag: any) => {
            const color = tag.length > 5 ? "geekblue" : "green";

            return (
              <Tag color={color} key={tag}>
                {tag}
              </Tag>
            );
          })}
        </>
      ),
    },
    {
      title: "action",
      key: "title",
      render: (_: any, { _id }: any) => (
        <>
          <Tag
            onClick={(event) => {
              event.preventDefault();
              console.log(_id);

              deleteNote(_id);
            }}
            color={"blue"}
            style={{ cursor: "pointer" }}
          >
            删除
          </Tag>
        </>
      ),
    },
  ];

  const deleteNote = async (_id: any) => {
    // return deleteNoteAPI(_id).then((res) => {
    //   console.log(res);
    //   getList().then((res) => {
    //     setData(res);
    //   });
    // });
  };

  const createNote = async () => {
    // return createNoteAPI().then((res) => {
    //   console.log(res.data.data._id);
    //   getList().then((res) => {
    //     setData(res);
    //   });
    //   return res.data.data._id;
    // });
  };

  const navigate = useNavigate();
  return (
    <div>
      <header className="flex gap-4">
        <Button
          onClick={() => {
            createNote().then((res) => {
              navigate(`/note/${res}`);
            });
          }}
        >
          <span>New</span>
        </Button>
        <MarkdownUpload
          onFinish={(props) => {
            createNote().then((res) => {
              navigate(`/note/${res}`, {
                state: { mdObject: props },
              });
            });
          }}
        >
          <Button>上传 Markdown</Button>
        </MarkdownUpload>
      </header>
      <div className="w-full h-200">
        <Table
          bordered={true}
          rowKey={"_id"}
          dataSource={data}
          columns={colums}
          onRow={(record) => {
            return {
              onMouseEnter: () => {
                setHoveredRowKey(record._id);
              },
              onMouseLeave: () => {
                setHoveredRowKey(null);
              },
              onChange: (event) => {
                console.log(event);
              },
            };
          }}
          pagination={false}
        />
      </div>
    </div>
  );
}

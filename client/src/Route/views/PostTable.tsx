import MarkdownUpload from "@/component/upload/MarkdownUpload";
import { Button, DatePicker, Table, Tag } from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function PostTable() {
  const [data, setData] = useState([]);
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
                  navigate(`/blog/${_id}`);
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
      title: "summary",
      dataIndex: "summary",
      key: "summary",
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

              deletePost(_id);
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

  const deletePost = async (_id: any) => {
    // return deletePostAPI(_id).then((res) => {
    //   console.log(res);
    //   getList().then((res) => {
    //     setData(res);
    //   });
    // });
  };

  const createPost = async () => {
    // return createPostAPI().then((res) => {
    //   console.log(res.data.data._id);
    //   getList().then((res) => {
    //     setData(res);
    //   });
    //   return res.data.data._id;
    // });
  };

  useEffect(() => {
    // getList().then((res) => {
    //   setData(res);
    // });
  }, []);
  const navigate = useNavigate();
  return (
    <div>
      <header className="flex gap-4">
        <Button
          onClick={() => {
            createPost().then((res) => {
              navigate(`/blog/${res}`);
            });
          }}
        >
          <span>New</span>
        </Button>
        <MarkdownUpload
          onFinish={(props) => {
            createPost().then((res) => {
              navigate(`/blog/${res}`, {
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
          onRow={(record, rowIndex) => {
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

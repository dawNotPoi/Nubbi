import { PostWithContent } from "@/api/post";
import ImgToGitupload from "@/component/upload/ImgToGitupload";
import { Button, Form, Input, message, Modal, Tabs } from "antd";
import { useEffect, useMemo, useState } from "react";

export default function BlogCard({
  data,
  className,
  onUpdate,
}: {
  data: PostWithContent;
  className?: string;
  onUpdate: (newData: Partial<Pick<typeof data, "title" | "cover">>) => void;
}) {
  useEffect(() => {
    setCardData({
      title: data.title,
      cover: data.cover,
    });
  }, [data]);
  const [messageApi, contextHolder] = message.useMessage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cardData, setCardData] = useState<
    Pick<typeof data, "title" | "cover">
  >({
    title: data.title,
    cover: data.cover,
  });
  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const updatePost = (
    newData: Partial<Pick<typeof data, "title" | "cover">>
  ) => {
    setCardData((v) => {
      const tmp = { ...v, ...newData };
      onUpdate(tmp);
      return tmp;
    });
  };

  const imgs = useMemo(() => {
    return Array.from(
      { length: 13 },
      (_, i) => `/cover/default (${i + 1}).png`
    );
  }, []);
  const tabs = [
    {
      key: "1",
      label: "Local",
      children: (
        <>
          <div
            style={{
              display: "flex",
              gap: "10px",
              alignContent: "start",
              height: "200px",
              flexWrap: "wrap",
              overflowY: "auto",
              scrollBehavior: "auto",
            }}
          >
            {imgs.map((item, index) => {
              return (
                <div
                  key={index}
                  onClick={() => {
                    updatePost({ cover: item });
                  }}
                  style={{
                    width: "23%",
                    height: "80px",
                    borderRadius: "4px",
                    overflow: "hidden",
                    cursor: "pointer",
                  }}
                >
                  <img
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                    src={item}
                    alt=""
                  />
                </div>
              );
            })}
          </div>
        </>
      ),
    },
    {
      key: "2",
      label: "Link",
      children: (
        <>
          <div style={{}}>
            <Form
              onFinish={(data) => {
                // TODO: 更新封面
                updatePost({ cover: data.link });
              }}
            >
              <Form.Item name="link">
                <Input placeholder="input link" />
              </Form.Item>
              <Form.Item>
                <div style={{ textAlign: "center" }}>
                  <Button
                    style={{ width: "50%" }}
                    size="large"
                    type="primary"
                    htmlType="submit"
                  >
                    Submit
                  </Button>
                </div>
              </Form.Item>
            </Form>
          </div>
        </>
      ),
    },
    {
      key: "3",
      label: "Upload",
      children: (
        <>
          <ImgToGitupload
            onFinish={(url: string) => {
              updatePost({ cover: url });
            }}
            onPreRender={(preUrl: string) => {
              setCardData((v) => {
                return { ...v, cover: preUrl };
              });
            }}
          />
        </>
      ),
    },
  ];
  return (
    <>
      {contextHolder}
      <div className={className}>
        <div>
          <div
            style={{
              position: "absolute",
              display: "flex",
              right: "10px",
              top: "10px",
              gap: "4px",
            }}
          >
            <Button onClick={showModal}>Change cover</Button>
            <Modal
              onCancel={handleCancel}
              width={720}
              footer
              open={isModalOpen}
            >
              <div>
                <Tabs defaultActiveKey="1" items={tabs} />
              </div>
            </Modal>
          </div>
        </div>
        <img
          style={{ width: "100%", objectFit: "cover", aspectRatio: "5/1" }}
          alt="error img link"
          src={cardData.cover || "/cover/default (2).png"}
          onError={(e: any) => {
            e.target.src = "/cover/default (2).png";
          }}
        />
      </div>
    </>
  );
}

import { NoteWithContent } from "@/api/note";
import ImgToGitupload from "@/component/upload/ImgToGitupload";
import { Button, Form, Input, Modal, Tabs } from "antd";
import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";

const STATUS_STYLES: Record<string, string> = {
  inbox: "bg-amber-50 text-amber-700",
  active: "bg-blue-50 text-blue-700",
  done: "bg-emerald-50 text-emerald-700",
  archived: "bg-neutral-100 text-neutral-600",
};

const imgs = [
  "https://www.notion.so/images/page-cover/webb1.jpg",
  "https://www.notion.so/images/page-cover/webb2.jpg",
  "https://www.notion.so/images/page-cover/webb3.jpg",
  "https://www.notion.so/images/page-cover/webb4.jpg",
  "https://www.notion.so/images/page-cover/nasa_the_blue_marble.jpg",
  "https://www.notion.so/images/page-cover/nasa_eva_during_skylab_3.jpg",
  "https://www.notion.so/images/page-cover/woodcuts_1.jpg",
];

export default function NoteCard({
  data,
  className,
  onUpdate,
}: {
  data: NoteWithContent;
  className?: string;
  onUpdate: (newData: Partial<Pick<typeof data, "title" | "cover">>) => void;
}) {
  useEffect(() => {
    setCardData({
      title: data.title,
      cover: data.cover,
    });
  }, [data]);

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

  const updateNote = (
    newData: Partial<Pick<typeof data, "title" | "cover">>,
  ) => {
    setCardData((value) => ({ ...value, ...newData }));
    onUpdate(newData);
  };

  const tabs = useMemo(() => {
    return [
      {
        key: "1",
        label: "Default",
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
                      updateNote({ cover: item });
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
                  updateNote({ cover: data.link });
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
                updateNote({ cover: url });
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
  }, []);
  return (
    <>
      <div className={clsx("relative group", className)}>
        <div>
          <div className="flex opacity-0 group-hover:opacity-100 absolute gap-2 right-2 top-2 ">
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
        {cardData.cover ? (
          <img
            style={{ width: "100%", objectFit: "cover", aspectRatio: "5/1" }}
            src={cardData.cover || ""}
          />
        ) : (
          <div className="w-full min-h-[200px]"></div>
        )}
        <div className="flex flex-wrap items-center gap-1.5 px-4 py-2.5">
          <span
            className={clsx(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              STATUS_STYLES[data.status] ?? "bg-neutral-100 text-neutral-600",
            )}
          >
            {data.status}
          </span>
          {data.published ? (
            <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
              published
            </span>
          ) : null}
          {data.tags.slice(0, 3).map((tag) => (
            <span
              className="max-w-[100px] truncate rounded-full bg-bg-selected px-2 py-0.5 text-xs text-text-muted"
              key={tag}
              title={tag}
            >
              {tag}
            </span>
          ))}
          {data.tags.length > 3 ? (
            <span className="text-xs text-text-subtle">
              +{data.tags.length - 3}
            </span>
          ) : null}
        </div>
      </div>
    </>
  );
}

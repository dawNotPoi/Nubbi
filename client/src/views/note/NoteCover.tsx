import type { NoteWithContent } from "@/api/note";
import ImgToGitupload from "@/component/upload/ImgToGitupload";
import { Button, Form, Input, Modal, Tabs } from "antd";
import clsx from "clsx";
import { ImagePlus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { NOTE_TITLE_ACTION_CLASS } from "./noteActionStyle";

const imgs = [
  "https://www.notion.so/images/page-cover/webb1.jpg",
  "https://www.notion.so/images/page-cover/webb2.jpg",
  "https://www.notion.so/images/page-cover/webb3.jpg",
  "https://www.notion.so/images/page-cover/webb4.jpg",
  "https://www.notion.so/images/page-cover/nasa_the_blue_marble.jpg",
  "https://www.notion.so/images/page-cover/nasa_eva_during_skylab_3.jpg",
  "https://www.notion.so/images/page-cover/woodcuts_1.jpg",
];

const DEFAULT_NOTE_COVER = imgs[0];

type NoteCoverMode = "cover" | "trigger";

type NoteCoverData = Pick<NoteWithContent, "cover">;

type NoteCoverUpdate = {
  cover: NoteCoverData["cover"];
};

type NoteCoverProps = {
  data: NoteCoverData;
  className?: string;
  mode?: NoteCoverMode;
  onUpdate: (newData: NoteCoverUpdate) => void;
};

type CoverLinkFormValues = {
  link?: string;
};

export default function NoteCover({
  data,
  className,
  mode = "cover",
  onUpdate,
}: NoteCoverProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cover, setCover] = useState(data.cover);

  useEffect(() => {
    setCover(data.cover);
  }, [data.cover]);

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const updateCover = useCallback((nextCover: NoteCoverData["cover"]) => {
    setCover(nextCover);
    onUpdate({ cover: nextCover });
  }, [onUpdate]);

  const showModal = useCallback(() => {
    if (!cover) {
      updateCover(DEFAULT_NOTE_COVER);
    }
    setIsModalOpen(true);
  }, [cover, updateCover]);

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
                      updateCover(item);
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
                onFinish={(values: CoverLinkFormValues) => {
                  if (values.link) {
                    updateCover(values.link);
                  }
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
                updateCover(url);
              }}
              onPreRender={(preUrl: string) => {
                setCover(preUrl);
              }}
            />
          </>
        ),
      },
    ];
  }, [updateCover]);

  const coverModal = (
    <Modal
      closable={false}
      footer={null}
      maskClosable
      onCancel={handleCancel}
      open={isModalOpen}
      width={720}
    >
      <div className="relative pt-7">
        {cover ? (
          <button
            className="absolute right-0 top-0 rounded px-2 py-1 text-sm text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
            onClick={() => {
              updateCover("");
              setIsModalOpen(false);
            }}
            type="button"
          >
            移除
          </button>
        ) : null}
        <Tabs defaultActiveKey="1" items={tabs} />
      </div>
    </Modal>
  );

  return (
    <>
      {mode === "trigger" ? (
        <>
          <button
            className={clsx(
              NOTE_TITLE_ACTION_CLASS,
              className,
            )}
            onClick={showModal}
            type="button"
          >
            <ImagePlus className="size-4" />
            <span>添加封面</span>
          </button>
          {coverModal}
        </>
      ) : null}
      {mode === "cover" ? (
      <div
        className={clsx(
          "relative",
          cover ? "group/cover mb-8" : "hidden",
          className,
        )}
      >
        {cover ? (
          <>
            <div className="absolute right-3 top-3 z-10 flex gap-2 opacity-0 transition-opacity group-hover/cover:opacity-100">
              <Button size="small" onClick={showModal}>
                编辑
              </Button>
              <Button onClick={() => updateCover("")} size="small">
                移除
              </Button>
            </div>
            <img
              style={{ width: "100%", objectFit: "cover", aspectRatio: "5/1" }}
              src={cover || ""}
              alt=""
            />
            {coverModal}
          </>
        ) : null}
      </div>
      ) : null}
    </>
  );
}

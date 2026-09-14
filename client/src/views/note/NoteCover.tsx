import type { NoteWithContent } from "@/api/note";
import ImgToGitupload from "@/component/upload/ImgToGitupload";
import { Button, Form, Input, Modal, Tabs } from "antd";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { NOTE_COVER_OPTIONS } from "./noteDefaults";

type NoteCoverData = Pick<NoteWithContent, "cover">;

type NoteCoverUpdate = {
  cover: NoteCoverData["cover"];
};

type NoteCoverProps = {
  data: NoteCoverData;
  className?: string;
  editorOpen: boolean;
  onEditorOpenChange: (open: boolean) => void;
  onUpdate: (newData: NoteCoverUpdate) => void;
};

type CoverLinkFormValues = {
  link?: string;
};

export default function NoteCover({
  data,
  editorOpen,
  className,
  onEditorOpenChange,
  onUpdate,
}: NoteCoverProps) {
  const [cover, setCover] = useState(data.cover);

  useEffect(() => {
    setCover(data.cover);
  }, [data.cover]);

  const handleCancel = () => {
    onEditorOpenChange(false);
  };

  const updateCover = useCallback(
    (nextCover: NoteCoverData["cover"]) => {
      setCover(nextCover);
      onUpdate({ cover: nextCover });
    },
    [onUpdate],
  );

  const showModal = useCallback(() => {
    onEditorOpenChange(true);
  }, [onEditorOpenChange]);

  const tabs = useMemo(() => {
    return [
      {
        key: "1",
        label: "Default",
        children: (
          <>
            <div className="grid h-[240px] grid-cols-2 content-start gap-2 overflow-y-auto sm:h-[200px] sm:grid-cols-4">
              {NOTE_COVER_OPTIONS.map((item, index) => {
                return (
                  <button
                    key={index}
                    onClick={() => {
                      updateCover(item);
                    }}
                    className="h-20 overflow-hidden rounded"
                    type="button"
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
                  </button>
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
      open={editorOpen}
      width={720}
    >
      <div className="relative pt-7">
        {cover ? (
          <button
            className="absolute right-0 top-0 rounded px-2 py-1 text-sm text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
            onClick={() => {
              updateCover("");
              onEditorOpenChange(false);
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
      {cover ? (
        <div
          className={clsx(
            "group/cover relative h-[24vh] min-h-[140px] max-h-[220px] w-full overflow-hidden md:h-[30vh] md:min-h-[180px] md:max-h-[280px]",
            className,
          )}
        >
          <div className="absolute right-3 top-3 z-10 flex gap-2 opacity-100 transition-opacity md:opacity-0 md:group-hover/cover:opacity-100">
            <button
              className="py-1 rounded-[3px] border border-neutral-200 bg-white/90 px-2.5 text-[12px] font-medium text-[#37352f] shadow-[0_1px_3px_rgba(15,15,15,0.12)] backdrop-blur-sm transition hover:bg-white hover:shadow-[0_2px_6px_rgba(15,15,15,0.16)]"
              onClick={showModal}
              type="button"
            >
              编辑
            </button>
          </div>
          <img
            className="h-full w-full object-cover"
            src={cover || ""}
            alt=""
          />
        </div>
      ) : null}
      {coverModal}
    </>
  );
}

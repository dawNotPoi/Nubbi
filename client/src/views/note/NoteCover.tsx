import type { NoteWithContent } from "@/api/note";
import ImgToGitupload from "@/component/upload/ImgToGitupload";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import clsx from "clsx";
import { useCallback, useEffect, useState, type FormEvent } from "react";
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

export default function NoteCover({
  data,
  editorOpen,
  className,
  onEditorOpenChange,
  onUpdate,
}: NoteCoverProps) {
  const [cover, setCover] = useState(data.cover);
  const [coverLink, setCoverLink] = useState("");

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

  /** 提交外链封面并保留原弹窗状态。 */
  const submitCoverLink = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextLink = coverLink.trim();
    if (nextLink) updateCover(nextLink);
  };

  const coverModal = (
    <Modal
      showClose={false}
      footer={null}
      maskClosable
      onCancel={handleCancel}
      open={editorOpen}
      width={720}
      title="编辑封面"
    >
      <div className="relative">
        {cover ? (
          <button
            className="absolute right-0 -top-12 rounded-compact px-2 py-1 text-sm text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
            onClick={() => {
              updateCover("");
              onEditorOpenChange(false);
            }}
            type="button"
          >
            移除
          </button>
        ) : null}
        <Tabs defaultValue="default">
          <TabsList>
            <TabsTrigger value="default">默认</TabsTrigger>
            <TabsTrigger value="link">链接</TabsTrigger>
            <TabsTrigger value="upload">上传</TabsTrigger>
          </TabsList>
          <TabsContent value="default">
            <div className="grid h-[240px] grid-cols-2 content-start gap-2 overflow-y-auto sm:h-[200px] sm:grid-cols-4">
              {NOTE_COVER_OPTIONS.map((item, index) => {
                return (
                  <button
                    key={index}
                    onClick={() => {
                      updateCover(item);
                    }}
                    className="h-20 overflow-hidden rounded-compact"
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
          </TabsContent>
          <TabsContent value="link">
            <form className="space-y-4" onSubmit={submitCoverLink}>
              <Input
                aria-label="封面图片链接"
                onChange={(event) => setCoverLink(event.target.value)}
                placeholder="输入图片链接"
                value={coverLink}
              />
              <div className="text-center">
                <Button className="w-1/2 max-md:min-h-11" variant="primary" type="submit">应用</Button>
              </div>
            </form>
          </TabsContent>
          <TabsContent value="upload">
            <ImgToGitupload
              onFinish={(url: string) => {
                updateCover(url);
              }}
              onPreRender={(preUrl: string) => {
                setCover(preUrl);
              }}
            />
          </TabsContent>
        </Tabs>
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
              className="py-1 rounded-compact border border-neutral-200 bg-white/90 px-2.5 text-[12px] font-medium text-[#37352f] shadow-[0_1px_3px_rgba(15,15,15,0.12)] backdrop-blur-sm transition hover:bg-white hover:shadow-[0_2px_6px_rgba(15,15,15,0.16)]"
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

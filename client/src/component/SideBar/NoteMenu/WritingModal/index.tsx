import { newPost, Post, PostWithContent } from "@/api/post";
import { Modal } from "@/component/UI/Dialog";
import { Divider } from "@/component/UI/Divider";
import Popover from "@/component/UI/Popover";
import CustomEditor from "@/component/editor/yoopta/YooptaEditor";
import { createPostAtom } from "@/store/atom/postAtom";
import { FileTextOutlined } from "@ant-design/icons";
import { useAtomValue } from "jotai";
import { useState } from "react";
import { MdOpenInFull } from "react-icons/md";
import { RiAddFill } from "react-icons/ri";
import { useNavigate } from "react-router-dom";
import { IconButton } from "../../components";
import { SearchNodeList } from "./SearchNodeList";

export const WrittingModal = ({
  parent,
  onTrigger,
}: {
  parent: Post;
  onTrigger?: () => void;
}) => {
  const [targetNote, setTargetNote] = useState<Post | null>(parent);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const { mutate: createPostMutate } = useAtomValue(createPostAtom);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const createPost = () => {
    const vars: Partial<PostWithContent> = {};
    if (title.trim().length > 0) {
      vars.title = title;
    }
    if (content.trim().length > 0) {
      vars.content = content;
    }
    if (targetNote?._id) {
      vars.parentId = targetNote._id;
    }
    const post = newPost(vars);
    createPostMutate(post);
  };
  const createPostHandler = () => {
    const vars: Partial<PostWithContent> = {};
    if (title.trim().length > 0) {
      vars.title = title;
    }
    if (content.trim().length > 0) {
      vars.content = content;
    }
    if (targetNote?._id) {
      vars.parentId = targetNote._id;
    }
    const post = newPost(vars);
    createPostMutate(post, {
      onSuccess: () => {
        navigate("note/" + post._id);
        setOpen(false);
      },
    });
  };
  return (
    <>
      <Modal
        open={open}
        className="max-w-3xl md:max-w-4xl lg:max-w-5xl w-full"
        onCancel={() => {
          setOpen(false);
          setTitle("");
          setContent("");
          if (title.length > 0 || content.length > 0) {
            createPost();
          }
        }}
        title={
          <div className="flex text-black/40 justify-start items-center">
            {/* 全屏按钮 */}
            <IconButton
              onClick={createPostHandler}
              className="flex items-center rotate-90"
            >
              <MdOpenInFull />
            </IconButton>
            <Divider orientation="vertical" className="mx-1 my-2" />
            <Popover
              trigger={
                <div>
                  <IconButton className="text-center flex gap-1 items-center">
                    <span>Add to</span> <FileTextOutlined />
                    <span className="text-black  font-bold">
                      {targetNote?.title || ""}
                    </span>
                  </IconButton>
                </div>
              }
            >
              <SearchNodeList />
            </Popover>
          </div>
        }
        trigger={
          <RiAddFill
            onClick={() => {
              onTrigger?.();
              setOpen(true);
            }}
            className="size-full"
          />
        }
      >
        <main className="px-10 max-h-[70vh] cursor-text h-full overflow-y-auto ">
          <header>
            <input
              value={title}
              onChange={(v) => setTitle(v.target.value)}
              className="text-3xl  w-full font-extrabold py-2 outline-none"
              type="text"
              placeholder="未命名文章"
            />
          </header>
          <CustomEditor
            defaultValue={content}
            onChange={(value) => {
              setContent(value);
            }}
          />
        </main>
      </Modal>
    </>
  );
};

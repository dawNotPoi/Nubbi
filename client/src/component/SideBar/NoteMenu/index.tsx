import { newPost } from "@/api/post";
import { createPostAtom, rootPostsAtom } from "@/store/atom/postAtom";
import { useSession } from "@/utils/auth";
import { useAtomValue } from "jotai";
import { useState } from "react";
import { RiAddFill } from "react-icons/ri";
import { useNavigate } from "react-router-dom";
import { IconButton } from "../components";
import NoteItem from "./NoteItem";

export default function NoteMenu() {
  const { data } = useSession();
  const user = data?.user.id;
  const { data: rootPosts, isLoading } = useAtomValue(
    rootPostsAtom(user || ""),
  );
  const { mutate: createPost } = useAtomValue(createPostAtom);
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();
  const createPostHandler = () => {
    const post = newPost();
    createPost(post, { onSuccess: () => navigate("note/" + post._id) });
  };
  return (
    <div>
      <div
        onClick={() => {
          setOpen((v) => !v);
        }}
        className="flex items-center group hover:bg-normal/40  rounded-md px-2 py-1 cursor-pointer  gap-2"
      >
        <span>笔记</span>
        {/* 根级添加/搜索按钮 */}
        <div className="ml-auto hidden group-hover:block">
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              createPostHandler();
            }}
          >
            <RiAddFill />
          </IconButton>
        </div>
      </div>
      {open &&
        (isLoading ? (
          <>loading</>
        ) : rootPosts?.length! > 0 ? (
          rootPosts?.map((post) => <NoteItem key={post._id} post={post} />)
        ) : (
          <div className="ml-4 text-sm text-gray-400 py-1">
            点击上方'+'号创建第一篇笔记吧 !
          </div>
        ))}
    </div>
  );
}

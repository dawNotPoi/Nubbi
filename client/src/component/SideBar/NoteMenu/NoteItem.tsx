import { Post } from "@/api/post";
import { IconButton, MenuItemContainer } from "@/component/SideBar/components";
import { deleteSinglePostAtom, postChildrenAtom } from "@/store/atom/postAtom";
import { FileTextOutlined, RightOutlined } from "@ant-design/icons";
import clsx from "clsx";
import { useAtomValue } from "jotai";
import { useState } from "react";
import { RiDeleteBinLine } from "react-icons/ri";
import { useNavigate, useParams } from "react-router-dom";
import { WrittingModal } from "./WritingModal";

function NoteItem({
  post,
  level = 1,
  className,
}: {
  post: Post;
  level?: number;
  className?: string;
}) {
  const { Id } = useParams();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  // 获取当前节点的子文章

  const { mutate: deletePost } = useAtomValue(deleteSinglePostAtom);
  const deletePostHandler = (postId: string) => {
    deletePost({ postId, parentId: post.parentId });
  };

  const ChildrenRender = () => {
    const { data: children, isLoading } = useAtomValue(
      postChildrenAtom(post._id)
    );
    return (
      <>
        {isLoading ? (
          <div className="ml-4 text-xs text-gray-400">加载中...</div>
        ) : children && children?.length > 0 ? (
          children?.map((child) => (
            <NoteItem key={child._id} post={child} level={level + 1} />
          ))
        ) : (
          <div className="ml-8 text-gray-400 py-1">暂无文章</div>
        )}
      </>
    );
  };

  return (
    <div className={clsx(className, "mt-0.5 ")}>
      <MenuItemContainer
        style={{ paddingLeft: level * 8 }}
        className={clsx(
          "flex items-center group hover:bg-neutral-400/40 rounded-md",
          post._id == Id && "bg-neutral-400/10"
        )}
      >
        <IconButton>
          <FileTextOutlined className="group-hover:hidden" />
          <RightOutlined
            onClick={() => {
              setOpen((v) => !v);
            }}
            className={clsx(
              "hidden group-hover:block transition-all",
              open && "rotate-90"
            )}
            size={20}
          />
        </IconButton>
        <span
          className="ml-1 flex-1 truncate cursor-pointer"
          onClick={() => navigate(`note/${post._id}`)}
        >
          {post.title || "未命名文章"}
        </span>

        {/* 删除按钮 */}
        <IconButton
          className="hidden group-hover:block size-6"
          onClick={() => deletePostHandler(post._id)}
        >
          <RiDeleteBinLine className="size-full" />
        </IconButton>
        {/* 添加按钮 */}
        <IconButton className="hidden group-hover:block size-6">
          <WrittingModal
            parent={post}
            onTrigger={() => setOpen(true)}
            parent={post}
          />
        </IconButton>
      </MenuItemContainer>
      {open && <ChildrenRender></ChildrenRender>}
    </div>
  );
}

export default NoteItem;

import { Post } from "@/api/post";
import { IconButton, MenuItemContainer } from "@/component/SideBar/components";
import {
  deleteSinglePostAtom,
  expandedNodesAtom,
  postChildrenAtom,
} from "@/store/atom/postAtom";
import { FileTextOutlined, RightOutlined } from "@ant-design/icons";
import clsx from "clsx";
import { useAtom, useAtomValue } from "jotai";
import { RiDeleteBinLine } from "react-icons/ri";
import { useNavigate, useParams } from "react-router-dom";
import { WrittingModal } from "./WritingModal";

const DEFAULT_TITLE = "未命名文档";

function NoteChildren({ postId, level }: { postId: string; level: number }) {
  const { data: children, isLoading } = useAtomValue(postChildrenAtom(postId));

  if (isLoading) {
    return <div className="ml-4 text-xs text-gray-400">加载中...</div>;
  }

  if (!children || children.length === 0) {
    return <div className="ml-8 py-1 text-gray-400">暂无文档</div>;
  }

  return children.map((child) => (
    <NoteItem key={child._id} post={child} level={level + 1} />
  ));
}

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
  const [expandedNodes, setExpandedNodes] = useAtom(expandedNodesAtom);
  const navigate = useNavigate();
  const { mutate: deletePost } = useAtomValue(deleteSinglePostAtom);
  const open = expandedNodes.includes(post._id);

  const deletePostHandler = (postId: string) => {
    deletePost({ postId, parentId: post.parentId });
  };

  const setOpen = (nextOpen: boolean | ((prev: boolean) => boolean)) => {
    setExpandedNodes((prev) => {
      const currentOpen = prev.includes(post._id);
      const resolvedOpen =
        typeof nextOpen === "function" ? nextOpen(currentOpen) : nextOpen;

      if (resolvedOpen) {
        return currentOpen ? prev : [...prev, post._id];
      }

      return prev.filter((id) => id !== post._id);
    });
  };

  return (
    <div className={clsx(className, "mt-0.5")}>
      <MenuItemContainer
        style={{ paddingLeft: level * 8 }}
        className={clsx(
          "group flex items-center rounded-md hover:bg-neutral-400/40",
          post._id === Id && "bg-neutral-400/10",
        )}
      >
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
        >
          <FileTextOutlined className="group-hover:hidden" />
          <RightOutlined
            className={clsx(
              "hidden transition-all group-hover:block",
              open && "rotate-90",
            )}
            size={20}
          />
        </IconButton>
        <span
          className="ml-1 flex-1 cursor-pointer truncate"
          onClick={() => navigate(`note/${post._id}`)}
        >
          {post.title || DEFAULT_TITLE}
        </span>

        <IconButton
          className="hidden size-6 group-hover:block"
          onClick={() => deletePostHandler(post._id)}
        >
          <RiDeleteBinLine className="size-full" />
        </IconButton>
        <IconButton className="hidden size-6 group-hover:block">
          <WrittingModal parent={post} onTrigger={() => setOpen(true)} />
        </IconButton>
      </MenuItemContainer>
      {open && <NoteChildren postId={post._id} level={level} />}
    </div>
  );
}

export default NoteItem;

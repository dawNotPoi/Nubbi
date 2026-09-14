import { Post } from "@/api/post";
import { IconButton, MenuItemContainer } from "@/component/SideBar/components";
import { postChildrenAtom } from "@/store/atom/postAtom";
import { FileTextOutlined, RightOutlined } from "@ant-design/icons";
import clsx from "clsx";
import { useAtomValue } from "jotai";
import { useState } from "react";

import { useParams } from "react-router-dom";

const DEFAULT_TITLE = "未命名文章";

function ItemBase({
  post,
  level = 1,
  className,
  expandable = false,
  onClick,
}: {
  post: Post;
  level?: number;
  className?: string;
  expandable?: boolean;
  onClick?: (note: Post) => void;
}) {
  const { Id } = useParams();
  const [open, setOpen] = useState(false);
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
            <ItemBase key={child._id} post={child} level={level + 1} />
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
        onClick={() => {
          onClick?.(post);
        }}
        style={{ paddingLeft: level * 8 }}
        className={clsx(
          "flex items-center group hover:bg-neutral-400/40 rounded-md",
          post._id == Id && "bg-neutral-400/10"
        )}
      >
        <IconButton>
          <FileTextOutlined
            className={clsx(expandable && "group-hover:hidden")}
          />
          {expandable && (
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
          )}
        </IconButton>
        <span className="ml-1 flex-1 truncate cursor-pointer">
          {post.title || DEFAULT_TITLE}
        </span>
      </MenuItemContainer>
      {expandable && open && <ChildrenRender></ChildrenRender>}
    </div>
  );
}

export default ItemBase;

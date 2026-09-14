import { Post } from "@/api/post";
import { IconButton, MenuItemContainer } from "@/component/SideBar/components";
import { postChildrenAtom } from "@/store/atom/postAtom";
import { FileTextOutlined, RightOutlined } from "@ant-design/icons";
import clsx from "clsx";
import { useAtomValue } from "jotai";
import { useState } from "react";
import { useParams } from "react-router-dom";

const DEFAULT_TITLE = "未命名文档";

function ItemBase({
  post,
  level = 1,
  className,
  expandable = false,
  onClick,
  selected = false,
  pathLabel,
}: {
  post: Post;
  level?: number;
  className?: string;
  expandable?: boolean;
  onClick?: (note: Post) => void;
  selected?: boolean;
  pathLabel?: string;
}) {
  const { Id } = useParams();
  const [open, setOpen] = useState(false);

  const ChildrenRender = () => {
    const { data: children, isLoading } = useAtomValue(
      postChildrenAtom(post._id),
    );

    return (
      <>
        {isLoading ? (
          <div className="ml-4 py-2 text-xs text-gray-400">加载中...</div>
        ) : children && children?.length > 0 ? (
          children?.map((child) => (
            <ItemBase key={child._id} post={child} level={level + 1} />
          ))
        ) : (
          <div className="ml-8 py-1 text-gray-400">暂无文档</div>
        )}
      </>
    );
  };

  return (
    <div className={clsx(className, "mt-0.5")}>
      <MenuItemContainer
        onClick={() => {
          onClick?.(post);
        }}
        style={{ paddingLeft: level * 8 }}
        className={clsx(
          "group flex items-center rounded-md text-sm transition-colors",
          "hover:bg-neutral-100",
          (post._id == Id || selected) && "bg-neutral-100 text-neutral-900",
        )}
      >
        <IconButton className="self-start pt-0.5 text-neutral-400">
          <FileTextOutlined
            className={clsx(expandable && "group-hover:hidden")}
          />
          {expandable && (
            <RightOutlined
              onClick={() => {
                setOpen((v) => !v);
              }}
              className={clsx(
                "hidden transition-all group-hover:block",
                open && "rotate-90",
              )}
              size={20}
            />
          )}
        </IconButton>
        <div className="ml-1 flex-1 overflow-hidden py-1">
          <div className="cursor-pointer truncate">
            {post.title || DEFAULT_TITLE}
          </div>
          {pathLabel ? (
            <div className="truncate text-xs text-neutral-400">{pathLabel}</div>
          ) : null}
        </div>
      </MenuItemContainer>
      {expandable && open && <ChildrenRender />}
    </div>
  );
}

export default ItemBase;

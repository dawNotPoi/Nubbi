import { newPost } from "@/api/post";
import { useAuth } from "@/hooks/useAuth";
import { createPostAtom } from "@/store/atom/postAtom";
import clsx from "clsx";
import { useAtomValue, useSetAtom } from "jotai";
import React from "react";
import { TbLayoutSidebarLeftCollapse, TbWritingSign } from "react-icons/tb";
import { useNavigate } from "react-router-dom";
import { sideBarOpenedAtom } from "../../store/atom/common";
import Image from "../UI/Image";
import Popover from "../UI/Popover";
import NoteMenu from "./NoteMenu";
import ResizeTab from "./ResizeTab";
import { IconButton, MenuItemContainer } from "./components";

const SideBar: React.FC = () => {
  const navigate = useNavigate();
  const setSideBarOpened = useSetAtom(sideBarOpenedAtom);
  const { mutate: createPost } = useAtomValue(createPostAtom);
  const { user, logout } = useAuth();
  return (
    <ResizeTab
      className={clsx("group/sidebar px-3 bg-normal/30 py-2 font-medium ")}
    >
      <div className="h-full flex flex-col">
        <MenuItemContainer className="flex gap-2 justify-between relative">
          <Popover
            trigger={
              <div className="flex gap-2 items-center cursor-pointer">
                <Image
                  className="rounded size-7"
                  src={user?.image || ""}
                  defaultLink="/default.jpg"
                  alt={user?.name}
                />
                <span>{user?.name}</span>
              </div>
            }
          >
            {
              <div className="py-2 w-[120px]">
                <button
                  className="px-2 py-2 w-full hover:bg-normal/60 text-slate-700  text-center"
                  onClick={logout}
                >
                  退出登录
                </button>
              </div>
            }
          </Popover>
          <div className="flex-1" />
          <div
            className="flex "
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <IconButton
              onClick={async () => {
                const post = newPost();
                createPost(post, {
                  onSuccess: () => navigate("/blog/" + post._id),
                });
              }}
              className="size-8"
            >
              <TbWritingSign className="size-full" />
            </IconButton>
            <IconButton
              className="size-8"
              onClick={() => {
                setSideBarOpened(false);
              }}
            >
              <TbLayoutSidebarLeftCollapse className="size-full" />
            </IconButton>
          </div>
        </MenuItemContainer>
        <div className="flex mt-2 flex-col flex-1 gap-2 overflow-auto ">
          {/* 主页 */}
          <MenuItemContainer>
            <header role="button" onClick={() => navigate("home")}>
              仪表盘
            </header>
          </MenuItemContainer>
          {/* 笔记 */}
          <NoteMenu />
          {/* 文件 */}
          <MenuItemContainer onClickCapture={() => navigate("file")}>
            <span>文件</span>
          </MenuItemContainer>
          <MenuItemContainer onClickCapture={() => navigate("meeting")}>
            <span>会议</span>
          </MenuItemContainer>
          <MenuItemContainer onClickCapture={() => navigate("/live/test")}>
            <span>视频测试页</span>
          </MenuItemContainer>
        </div>
      </div>
    </ResizeTab>
  );
};

export default SideBar;

import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

/** 侧边栏展开状态，持久化到 localStorage */
export const sideBarOpenedAtom = atomWithStorage("sidebar-opened", true);

/** 迁移期保留：旧移动侧栏状态。新 Mobile Shell 不再渲染 Desktop Sidebar。 */
export const mobileSideBarOpenedAtom = atom(false);

/**
 * 移动端临时任务（搜索、多选等）可隐藏一级 Bottom Navigation。
 * 页面卸载时必须恢复为 false，避免状态泄漏到其他路由。
 */
export const mobileBottomNavHiddenAtom = atom(false);

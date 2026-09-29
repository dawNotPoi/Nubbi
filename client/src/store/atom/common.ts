import { atom } from "jotai";

/** 每次进入应用默认展开；用户主动收起后才启用边缘悬停预览。 */
export const sideBarOpenedAtom = atom(true);

/** 迁移期保留：旧移动侧栏状态。新 Mobile Shell 不再渲染 Desktop Sidebar。 */
export const mobileSideBarOpenedAtom = atom(false);

/**
 * 移动端临时任务（搜索、多选等）可隐藏一级 Bottom Navigation。
 * 页面卸载时必须恢复为 false，避免状态泄漏到其他路由。
 */
export const mobileBottomNavHiddenAtom = atom(false);

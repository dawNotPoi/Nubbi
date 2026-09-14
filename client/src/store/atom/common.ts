import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

/** 侧边栏展开状态，持久化到 localStorage */
export const sideBarOpenedAtom = atomWithStorage("sidebar-opened", true);

/** 移动端侧边栏展开状态，仅会话内有效 */
export const mobileSideBarOpenedAtom = atom(false);


import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

// import { getList } from "../../api/note";
export const sideBarOpenedAtom = atomWithStorage("sidebar-opened", true);
export const mobileSideBarOpenedAtom = atom(false);


import { ObjectId } from "bson";
import request, { Get } from "./request";

export interface Note {
  auther?: string;
  _id: string;
  title: string;
  parentId?: string | null;
  meta?: {
    date?: number;
    status?: string;
    tags?: string[];
    type?: string;
    [key: string]: any;
  };
  createdAt?: string;
  updatedAt?: string;
  children: Note[];
  cover: string;
}

export interface SearchNote extends Note {
  pathLabel?: string;
}

export interface NotePathItem {
  _id: string;
  title: string;
}

export const newNote = (note?: Partial<NoteWithContent>): NoteWithContent => ({
  _id: new ObjectId().toHexString(),
  title: "",
  meta: { date: Date.now(), status: "Draft", tags: [], type: "" },
  children: [],
  cover: "",
  content: "",
  ...note,
});

export interface NoteWithContent extends Note {
  content?: string;
}

// 创建笔记
export async function createNote(data: NoteWithContent) {
  return request<Note>("note/create", {
    ...data,
  });
}

// 获取根级笔记
export const getRootNotes = async (owner: string) => {
  return Get<Note[]>("note/roots", { owner });
};

//获取最近修改的笔记
export const getRecentNotes = async () => {
  return Get<Note[]>("note/recent");
};

// 获取直接子笔记
export const getDirectChildren = async (parentId: string) => {
  return Get<Note[]>("note/children", { parentId });
};

// 更新笔记内容
export async function updateNoteContent(noteId: string, content: string) {
  return request<NoteWithContent>("note/content", { noteId, content }, "put");
}

// 更新笔记属性
export async function updateNoteProperties(
  noteId: string,
  properties: {
    title?: string;
    tags?: string[];
    status?: "Draft" | "Published" | "Archived";
    parentId?: string | null;
    meta?: Record<string, any>;
    cover?: string;
  }
) {
  return request<Note>("note/properties", { noteId, ...properties }, "put");
}

// 删除笔记（支持单个和批量）
export async function deleteNote(noteId: string) {
  return request("note/delete", { noteId }, "delete");
}

// 获取单个笔记详情（包含内容）
export async function getNoteDetail(noteId: string) {
  return Get<NoteWithContent>("note/detail", { noteId });
}

export async function getNoteAncestors(noteId: string) {
  return Get<NotePathItem[]>("note/ancestors", { noteId });
}

export async function getList() {
  return Get<Note[]>("note/list");
}

export async function findNote(noteId: string) {
  return Get<Note>("note/find", { noteId });
}

//搜索笔记
export async function searchNotes(title: string) {
  return request<SearchNote[]>("note/search", { title });
}

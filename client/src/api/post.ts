import { ObjectId } from "bson";
import request, { Get } from "./request";

export interface Post {
  auther?: string;
  _id: string;
  title: string;
  parentId?: string | null;
  meta?: {
    date?: number;
    status?: string;
    summary?: string;
    tags?: string[];
    type?: string;
    [key: string]: any;
  };
  createdAt?: string;
  updatedAt?: string;
  children: Post[];
  cover: string;
}

export interface SearchPost extends Post {
  pathLabel?: string;
}

export const newPost = (post?: Partial<PostWithContent>): PostWithContent => ({
  _id: new ObjectId().toHexString(),
  title: "",
  meta: { date: Date.now(), status: "Draft", summary: "", tags: [], type: "" },
  children: [],
  cover: "",
  content: "",
  ...post,
});

export interface PostWithContent extends Post {
  content?: string;
}

// 创建文章
export async function createPost(data: PostWithContent) {
  return request<Post>("post/create", {
    ...data,
  });
}

// 获取根级文章
export const getRootPosts = async (owner: string) => {
  return Get<Post[]>("post/roots", { owner });
};

//获取最近修改的文章
export const getRencentPosts = async () => {
  return Get<Post[]>("post/recent");
};

// 获取直接子文章
export const getDirectChildren = async (parentId: string) => {
  return Get<Post[]>("post/children", { parentId });
};

// 更新文章内容
export async function updatePostContent(postId: string, content: string) {
  return request<PostWithContent>("post/content", { postId, content }, "put");
}

// 更新文章属性
export async function updatePostProperties(
  postId: string,
  properties: {
    title?: string;
    tags?: string[];
    summary?: string;
    status?: "Draft" | "Published" | "Archived";
    parentId?: string;
    meta?: Record<string, any>;
    cover?: string;
  }
) {
  return request<Post>("post/properties", { postId, ...properties }, "put");
}

// 删除文章（支持单个和批量）
export async function deletePost(postId: string) {
  return request("post/delete", { postId }, "delete");
}

// 获取单个文章详情（包含内容）
export async function getPostDetail(postId: string) {
  return Get<PostWithContent>("post/detail", { postId });
}

export async function getList() {
  return Get<Post[]>("post/list");
}

export async function findPost(postId: string) {
  return Get<Post>("post/find", { postId });
}

//搜索文章
export async function searchPosts(title: string) {
  return request<SearchPost[]>("post/search", { title });
}

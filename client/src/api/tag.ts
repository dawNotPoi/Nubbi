import request, { Get } from "./request";

export async function getTags() {
  return Get<string[]>("tag/list");
}

export async function createTag(name: string) {
  return request<string>("tag/create", { name }, "post");
}

export async function deleteTag(name: string) {
  return request<null>("tag/delete", { name }, "delete");
}

import { authClient } from "@/utils/auth";
import request, { requestWithNoJson } from "./request";
const baseUrl = import.meta.env.VITE_API_URL;

export interface FolderRecord {
  _id: string;
  name: string;
  parentId?: string | null;
  ownerId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FileRecord {
  _id: string;
  name: string;
  size?: number | string;
  type?: string;
  updatedAt?: string;
  createdAt?: string;
}

export interface FileListData {
  folders: FolderRecord[];
  files: FileRecord[];
}

export interface InitUploadInstantData {
  needUpload: false;
}

export interface InitUploadPendingData {
  status: "UPLOADING";
  uploadId: string;
  uploadedChunks: number[];
}

export type InitUploadTaskData = InitUploadInstantData | InitUploadPendingData;

export const listFiles = async (parentId?: string) => {
  return request<FileListData>("file/list", { parentId });
};

export const createFloder = async (name?: string, parentId?: string) => {
  return request<FolderRecord>("file/createfolder", { parentId, name });
};

export const getAllFolders = async () => {
  return request<FolderRecord[]>("file/folders", undefined, "get");
};

export async function deleteFile(
  _id: string,
  kind: "file" | "folder" = "file",
) {
  return request("file/delete", { fileId: _id, kind }, "post");
}

export async function deleteFilesBatch(fileIds: string[]) {
  return request<{
    deletedCount: number;
    deletedFileCount: number;
    deletedFolderCount: number;
    deletedIds: string[];
    missingFileIds: string[];
    missingFolderIds: string[];
  }>(
    "file/delete-batch",
    {
      targets: fileIds.map((id) => ({ id, kind: "file" as const })),
    },
    "post",
  );
}

export async function deleteTargetsBatch(
  targets: Array<{ id: string; kind: "file" | "folder" }>,
) {
  return request<{
    deletedCount: number;
    deletedFileCount: number;
    deletedFolderCount: number;
    deletedIds: string[];
    missingFileIds: string[];
    missingFolderIds: string[];
  }>("file/delete-batch", { targets }, "post");
}

export async function renameFile(
  _id: string,
  name: string,
  kind: "file" | "folder" = "file",
) {
  return request("file/rename", { _id, name, kind });
}

export async function moveFileItem(
  _id: string,
  targetFolderId: string,
  kind: "file" | "folder",
) {
  return request("file/move", { _id, targetFolderId, kind });
}

//鍒濆鍖栦笂浼犱换鍔?hash妫€楠?
export const initUploadTask = async (param: {
  fileName: string;
  fileHash: string;
  totalSize: string;
  totalChunksSize: string;
  folderId?: string;
}) => {
  return request<InitUploadTaskData>("file/init", param);
};

//涓婁紶鍒嗙墖
export const uploadChunk = async (formdata: FormData) => {
  return requestWithNoJson("/file/uploadchunk", formdata);
};

//鍒嗙墖鍚堝苟
export const mergeChunk = async (uploadId: string) => {
  return request("/file/merge", { uploadId });
};

export const imgToGitCloud = async (file: File): Promise<string> => {
  const token = import.meta.env.VITE_GITHUB_TOKEN;
  const repo = import.meta.env.VITE_GITHUB_REPO;
  const formData = new FormData();
  formData.append("file", file);
  const reader = new FileReader();
  function getBase64(file: File) {
    return new Promise((resolve, reject) => {
      reader.onload = function (event) {
        const fileContent = event.target?.result as string;
        if (!fileContent) {
          reject(new Error("鏂囦欢涓虹┖"));
        }
        resolve(fileContent!.split(",")[1]);
      };
      reader.readAsDataURL(file);
    });
  }
  const path = "img/" + new Date().valueOf() + "_" + file.name;

  const content = await getBase64(file);
  const url = "https://api.github.com/repos/" + repo + "/contents/" + path;

  const res = await fetch(url, {
    method: "put",
    headers: {
      Authorization: `token ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: "Upload image",
      content,
      branch: "main",
      path,
    }),
  });
  if (res.ok) {
    const data = await res.json();
    return data.content.download_url;
  } else {
    console.log(res);
    console.log("鏂囦欢鏍煎紡閿欒");
    return "";
  }
};

export const getFileDownloadUrl = (fileId: string) => {
  return `${baseUrl}/file/download/${fileId}`;
};

export const getFilePreviewUrl = (fileId: string) => {
  return `${baseUrl}/file/preview/${fileId}`;
};

const getAuthorizedFileRequestInit = async (): Promise<RequestInit> => {
  const session = await authClient.getSession();
  const token = session.data?.session.token;

  return {
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  };
};

export const fetchFilePreviewBlob = async (fileId: string) => {
  const response = await fetch(
    getFilePreviewUrl(fileId),
    await getAuthorizedFileRequestInit(),
  );

  if (response.status === 401) {
    await authClient.signOut();
    const returnTo = encodeURIComponent(
      `${window.location.pathname}${window.location.search}${window.location.hash}`,
    );
    window.location.href = `/login?returnTo=${returnTo}`;
    throw new Error("认证失败，请重新登录");
  }

  if (!response.ok) {
    throw new Error(`文件预览加载失败: ${response.status}`);
  }

  const blob = await response.blob();

  return {
    blob,
    contentType: response.headers.get("content-type") || blob.type || "",
  };
};

import { getApiBaseUrl } from "@/utils/env";
import request, { authorizedFetch, requestWithNoJson } from "./request";

const baseUrl = getApiBaseUrl();

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
  needUpload?: true;
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

export const initUploadTask = async (param: {
  fileName: string;
  fileHash: string;
  totalSize: string;
  totalChunksSize: string;
  folderId?: string;
}) => {
  return request<InitUploadTaskData>("file/init", param);
};

export const uploadChunk = async (formdata: FormData) => {
  return requestWithNoJson("/file/uploadchunk", formdata);
};

export const mergeChunk = async (uploadId: string) => {
  return request("/file/merge", { uploadId });
};

export const imgToGitCloud = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await requestWithNoJson<{ url: string }>("/image/github", formData);

  if (response.code !== 1 || !response.data?.url) {
    throw new Error(response.message || "GitHub 图床上传失败");
  }

  return response.data.url;
};

export const getFileDownloadUrl = (fileId: string) => {
  return `${baseUrl}/file/download/${fileId}`;
};

export const getFilePreviewUrl = (fileId: string) => {
  return `${baseUrl}/file/preview/${fileId}`;
};

export const fetchFilePreviewBlob = async (fileId: string) => {
  const response = await authorizedFetch(`/file/preview/${fileId}`);

  if (!response.ok) {
    throw new Error(`文件预览加载失败: ${response.status}`);
  }

  const blob = await response.blob();

  return {
    blob,
    contentType: response.headers.get("content-type") || blob.type || "",
  };
};

export const fetchFilePreviewStreamUrl = async (fileId: string) => {
  const response = await authorizedFetch(
    `/file/preview-url/${encodeURIComponent(fileId)}`,
    { method: "GET" },
  );

  if (!response.ok) {
    throw new Error(`文件流式预览地址获取失败: ${response.status}`);
  }

  const result = (await response.json()) as {
    code: 0 | 1;
    data?: {
      url?: string;
      expiresAt?: number;
    };
    message?: string;
  };

  if (result.code !== 1 || !result.data?.url || !result.data.expiresAt) {
    throw new Error(result.message || "文件流式预览地址获取失败");
  }

  const url = result.data.url.startsWith("http")
    ? result.data.url
    : `${baseUrl}${result.data.url.startsWith("/") ? "" : "/"}${result.data.url}`;

  return {
    url,
    expiresAt: result.data.expiresAt,
  };
};

import request, { authorizedFetch, requestWithNoJson } from "./request";

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
  const token = import.meta.env.VITE_GITHUB_TOKEN;
  const repo = import.meta.env.VITE_GITHUB_REPO;
  const formData = new FormData();
  formData.append("file", file);
  const reader = new FileReader();

  function getBase64(nextFile: File) {
    return new Promise((resolve, reject) => {
      reader.onload = function (event) {
        const fileContent = event.target?.result as string;
        if (!fileContent) {
          reject(new Error("文件为空"));
          return;
        }
        resolve(fileContent.split(",")[1]);
      };
      reader.readAsDataURL(nextFile);
    });
  }

  const path = `img/${new Date().valueOf()}_${file.name}`;
  const content = await getBase64(file);
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;

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
  }

  console.log(res);
  console.log("文件格式错误");
  return "";
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

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

export async function deleteFile(_id: string) {
  return request("file/delete", { _id }, "delete");
}

export async function renameFile(_id: string, name: string) {
  return request("file/rename", { _id, name });
}

//初始化上传任务,hash检验
export const initUploadTask = async (param: {
  fileName: string;
  fileHash: string;
  totalSize: string;
  totalChunksSize: string;
  folderId?: string;
}) => {
  return request<InitUploadTaskData>("file/init", param);
};

//上传分片
export const uploadChunk = async (formdata: FormData) => {
  return requestWithNoJson("/file/uploadchunk", formdata);
};

//分片合并
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
          reject(new Error("文件为空"));
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
    console.log("文件格式错误");
    return "";
  }
};

export const getFileDownloadUrl = (fileId: string) => {
  return `${baseUrl}/file/download/${fileId}`;
};

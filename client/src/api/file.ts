import request, { Get, requestWithNoJson } from "./request";

export const getFiles = async () => {
  return Get("file/getFiles");
};

export async function deleteFile(_id: string) {
  return request("file/delete", { _id }, "delete");
}

export async function checkFile(hash: string, name: string) {
  return Get("file/checkFile", { hash, name });
}

export async function renameFile(_id: string, name: string) {
  return request("file/rename", { _id, name });
}

export const uploadChunk = async (formdata: FormData) => {
  return requestWithNoJson("/file/upload", formdata);
};

export const mergeChunk = async ({
  hash,
  name,
}: {
  hash: string;
  name: string;
}) => {
  return Get("/file/merge", { hash, name });
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
        console.log("test", event);

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

import { getApiBaseUrl } from "@/utils/env";
import request, { authorizedFetch, requestWithNoJson } from "./request";

const baseUrl = getApiBaseUrl();
const resolveApiUrl = (url: string) =>
  url.startsWith("http")
    ? url
    : `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;

const readFileResponseError = async (response: Response, fallback: string) => {
  try {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const result = (await response.json()) as {
        message?: unknown;
        error?: unknown;
      };
      if (typeof result.message === "string" && result.message.trim()) {
        return result.message;
      }
      if (typeof result.error === "string" && result.error.trim()) {
        return result.error;
      }
    }
    const text = await response.text();
    return text.trim() || fallback;
  } catch {
    return fallback;
  }
};

export const imgToGitCloud = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await requestWithNoJson<{ url: string }>(
    "/image/github",
    formData,
  );
  if (response.code !== 1 || !response.data?.url) {
    throw new Error(response.message || "GitHub 图床上传失败");
  }
  return response.data.url;
};

export const fetchFileDownloadBlob = async (fileId: string) => {
  const response = await authorizedFetch(
    `/file/download/${encodeURIComponent(fileId)}`,
    { method: "GET" },
  );
  if (!response.ok) {
    throw new Error(
      await readFileResponseError(response, `文件下载失败: ${response.status}`),
    );
  }
  return {
    blob: await response.blob(),
    contentType: response.headers.get("content-type") || "",
  };
};

export const getFilePreviewUrl = (fileId: string) =>
  `${baseUrl}/file/preview/${fileId}`;

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

const fetchTemporaryUrl = async (path: string, fallback: string) => {
  const response = await authorizedFetch(path, { method: "GET" });
  if (!response.ok) {
    throw new Error(await readFileResponseError(response, fallback));
  }
  const result = (await response.json()) as {
    code: 0 | 1;
    data?: { url?: string; expiresAt?: number };
    message?: string;
  };
  if (result.code !== 1 || !result.data?.url || !result.data.expiresAt) {
    throw new Error(result.message || fallback);
  }
  return {
    url: resolveApiUrl(result.data.url),
    expiresAt: result.data.expiresAt,
  };
};

export const fetchFilePreviewStreamUrl = (fileId: string) =>
  fetchTemporaryUrl(
    `/file/preview-url/${encodeURIComponent(fileId)}`,
    "文件流式预览地址获取失败",
  );

export const fetchFileShareDownloadUrl = (fileId: string) =>
  fetchTemporaryUrl(
    `/file/share-url/${encodeURIComponent(fileId)}`,
    "文件分享链接获取失败",
  );

export const updateUserAvatar = (imageUrl: string) =>
  request<{ image: string }>("/auth/avatar/update", { imageUrl });

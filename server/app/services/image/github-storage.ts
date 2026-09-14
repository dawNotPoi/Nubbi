import { httpError } from "@/common/http-error";
import logger from "@/common/logger";
import env from "@/lib/env";

export type GitHubImageUpload = {
  url: string;
  path: string;
  sha: string;
};

const getSafeFileName = (name: string): string =>
  name
    .replace(/[\\/:*?"<>|#%{}[\]^~`]/g, "_")
    .replace(/\s+/g, "_");

const parseGitHubUploadResult = (
  value: unknown,
): { url: string; sha: string } | null => {
  if (!value || typeof value !== "object" || !("content" in value)) return null;
  const content = value.content;
  if (!content || typeof content !== "object") return null;

  const url = "download_url" in content ? content.download_url : undefined;
  const sha = "sha" in content ? content.sha : undefined;
  if (typeof url !== "string" || !url) return null;
  if (typeof sha !== "string" || !sha) return null;
  return { url, sha };
};

const requireGitHubImageConfig = (): {
  repository: string;
  token: string;
  branch: string;
} => {
  if (!env.GH_IMAGE_REPO || !env.GH_IMAGE_TOKEN) {
    throw httpError(500, "GitHub 图床未配置");
  }
  return {
    repository: env.GH_IMAGE_REPO,
    token: env.GH_IMAGE_TOKEN,
    branch: env.GH_IMAGE_BRANCH || "main",
  };
};

const getContentApiUrl = (repository: string, remotePath: string): string => {
  const encodedPath = remotePath.split("/").map(encodeURIComponent).join("/");
  return `https://api.github.com/repos/${repository}/contents/${encodedPath}`;
};

export const uploadGitHubImage = async (
  file: Express.Multer.File,
): Promise<GitHubImageUpload> => {
  const config = requireGitHubImageConfig();
  const safeName = getSafeFileName(file.originalname || "image") || "image";
  const remotePath = `img/${Date.now()}_${safeName}`;
  let response: Response;

  try {
    response = await fetch(
      getContentApiUrl(config.repository, remotePath),
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${config.token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `Upload image ${safeName}`,
          content: file.buffer.toString("base64"),
          branch: config.branch,
        }),
      },
    );
  } catch (error) {
    logger.error("GitHub 图片上传请求失败", { error });
    throw httpError(502, "GitHub 图床暂时不可用");
  }

  if (!response.ok) {
    const responseBody = (await response.text()).slice(0, 2_000);
    logger.error("GitHub 图片上传失败", {
      status: response.status,
      statusText: response.statusText,
      body: responseBody,
    });
    throw httpError(502, "GitHub 图片上传失败");
  }

  try {
    const result = parseGitHubUploadResult(await response.json());
    if (result) return { ...result, path: remotePath };
  } catch (error) {
    logger.error("GitHub 图片上传响应解析失败", { error });
  }
  throw httpError(502, "GitHub 图片上传响应无效");
};

export const deleteGitHubImage = async (
  remotePath: string,
  remoteSha: string,
): Promise<void> => {
  const config = requireGitHubImageConfig();
  const response = await fetch(
    getContentApiUrl(config.repository, remotePath),
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Delete image ${remotePath}`,
        sha: remoteSha,
        branch: config.branch,
      }),
    },
  );

  if (response.ok || response.status === 404) return;
  throw new Error(`GitHub image deletion failed with ${response.status}`);
};

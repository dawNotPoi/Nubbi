import env from "@/lib/env";
import crypto from "crypto";

export const PREVIEW_STREAM_TTL_MS = 60 * 60 * 1000;
export const FILE_SHARE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const normalizeQueryValue = (value: unknown): string => {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : "";
  }
  return typeof value === "string" ? value : "";
};

export const createPreviewSignature = (
  fileId: string,
  userId: string,
  expiresAt: number,
): string =>
  crypto
    .createHmac("sha256", env.BETTER_AUTH_SECRET)
    .update(`${fileId}:${userId}:${expiresAt}`)
    .digest("hex");

const createShareDownloadSignature = (
  fileId: string,
  userId: string,
  expiresAt: number,
) =>
  crypto
    .createHmac("sha256", env.BETTER_AUTH_SECRET)
    .update(`share-download:${fileId}:${userId}:${expiresAt}`)
    .digest("hex");

const isSafeEqual = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
};

const buildSignedPath = (
  pathname: string,
  userId: string,
  expiresAt: number,
  token: string,
): string => {
  const params = new URLSearchParams({
    uid: userId,
    expires: String(expiresAt),
    token,
  });
  return `${pathname}?${params.toString()}`;
};

export const buildPreviewStreamPath = (
  fileId: string,
  userId: string,
  expiresAt: number,
): string =>
  buildSignedPath(
    `/file/stream/${encodeURIComponent(fileId)}`,
    userId,
    expiresAt,
    createPreviewSignature(fileId, userId, expiresAt),
  );

export const buildPublicDownloadPath = (
  fileId: string,
  userId: string,
  expiresAt: number,
): string =>
  buildSignedPath(
    `/file/public-download/${encodeURIComponent(fileId)}`,
    userId,
    expiresAt,
    createShareDownloadSignature(fileId, userId, expiresAt),
  );

const resolveSignedUserId = (
  fileId: string,
  query: Record<string, unknown>,
  createSignature: (fileId: string, userId: string, expiresAt: number) => string,
): string | null => {
  const userId = normalizeQueryValue(query.uid);
  const expires = normalizeQueryValue(query.expires);
  const token = normalizeQueryValue(query.token);
  const expiresAt = Number(expires);
  if (!userId || !expires || !token || !Number.isFinite(expiresAt)) return null;
  if (expiresAt < Date.now()) return null;
  const expectedToken = createSignature(fileId, userId, expiresAt);
  return isSafeEqual(token, expectedToken) ? userId : null;
};

export const resolveSignedPreviewUserId = (
  fileId: string,
  query: Record<string, unknown>,
): string | null =>
  resolveSignedUserId(fileId, query, createPreviewSignature);

export const resolveSignedShareDownloadUserId = (
  fileId: string,
  query: Record<string, unknown>,
): string | null =>
  resolveSignedUserId(fileId, query, createShareDownloadSignature);

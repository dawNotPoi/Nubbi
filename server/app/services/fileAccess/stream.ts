import type { Response } from "express";
import fse from "fs-extra";
import path from "path";

export type StreamableFile = {
  storagePath: string;
  mimeType?: string | null;
  extension?: string | null;
  name: string;
};

export const resolveFileResponseType = (file: StreamableFile): string => {
  const mimeType = (file.mimeType || "").toLowerCase().trim();
  const isGeneric =
    !mimeType ||
    mimeType === "application/octet-stream" ||
    mimeType === "binary/octet-stream";
  return isGeneric
    ? file.extension || path.extname(file.name) || file.mimeType || "bin"
    : file.mimeType!;
};

export const streamFileResponse = async (
  res: Response,
  file: StreamableFile,
  rangeHeader?: string,
): Promise<void> => {
  const stat = await fse.stat(file.storagePath);
  const fileSize = stat.size;
  res.type(resolveFileResponseType(file));
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${encodeURIComponent(file.name)}"`,
  );
  res.setHeader("Cache-Control", "private, max-age=60");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Accept-Ranges", "bytes");

  if (!rangeHeader) {
    res.setHeader("Content-Length", String(fileSize));
    fse.createReadStream(file.storagePath).pipe(res);
    return;
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match) {
    res.status(416).end();
    return;
  }
  let start = match[1] ? Number(match[1]) : 0;
  let end = match[2] ? Number(match[2]) : fileSize - 1;
  if (!match[1] && match[2]) {
    const suffixLength = Number(match[2]);
    start = Math.max(fileSize - suffixLength, 0);
    end = fileSize - 1;
  }
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start < 0 ||
    end < start ||
    start >= fileSize
  ) {
    res.setHeader("Content-Range", `bytes */${fileSize}`);
    res.status(416).end();
    return;
  }
  end = Math.min(end, fileSize - 1);
  res.status(206);
  res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
  res.setHeader("Content-Length", String(end - start + 1));
  fse.createReadStream(file.storagePath, { start, end }).pipe(res);
};

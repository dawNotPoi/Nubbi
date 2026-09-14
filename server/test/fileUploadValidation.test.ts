import assert from "node:assert/strict";
import test from "node:test";
import { buildInstantFileFilter } from "../app/services/fileUpload/initTask";
import {
  expectedChunkBytes,
  initUploadSchema,
} from "../app/services/fileUpload/schemas";

const MEBIBYTE = 1024 * 1024;
const HASH = "a".repeat(32);

test("accepts a valid adaptive chunk upload", () => {
  const result = initUploadSchema.safeParse({
    fileName: "archive.zip",
    fileHash: HASH,
    totalSize: 5 * MEBIBYTE + 123,
    chunkSize: 5 * MEBIBYTE,
    totalChunks: 2,
    mimeType: "application/zip",
  });
  assert.equal(result.success, true);
});

test("rejects path-like hashes and inconsistent chunk counts", () => {
  assert.equal(
    initUploadSchema.safeParse({
      fileName: "archive.zip",
      fileHash: "../../storage/uploads",
      totalSize: 5 * MEBIBYTE + 1,
      chunkSize: 5 * MEBIBYTE,
      totalChunks: 1,
    }).success,
    false,
  );
  assert.equal(
    initUploadSchema.safeParse({
      fileName: "archive.zip",
      fileHash: HASH,
      totalSize: 5 * MEBIBYTE + 1,
      chunkSize: 5 * MEBIBYTE,
      totalChunks: 1,
    }).success,
    false,
  );
});

test("calculates the exact final chunk size and rejects an invalid index", () => {
  assert.equal(expectedChunkBytes(12, 5, 3, 0), 5);
  assert.equal(expectedChunkBytes(12, 5, 3, 2), 2);
  assert.equal(expectedChunkBytes(12, 5, 3, 3), null);
});

test("scopes instant upload matching by owner, hash, and size", () => {
  assert.deepEqual(
    buildInstantFileFilter("owner-a", { fileHash: HASH, totalSize: 42 }),
    { ownerId: "owner-a", hash: HASH, size: 42, status: "active" },
  );
});

import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { FileUploadError } from "../app/services/fileUpload/errors";
import { mergeTaskChunks } from "../app/services/fileUpload/storage";

test("merges a complete chunk set into an atomic final file", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "nubbi-upload-"));
  await writeFile(path.join(tempDir, "0"), "abc");
  await writeFile(path.join(tempDir, "1"), "def");

  const finalPath = await mergeTaskChunks({
    _id: "0123456789abcdef01234567",
    ownerId: `storage-test-${Date.now()}`,
    fileHash: "f".repeat(32),
    fileName: "sample.bin",
    totalSize: 6,
    chunkSize: 3,
    totalChunks: 2,
    tempDir,
    uploadedChunks: [1, 0],
  });

  assert.equal((await readFile(finalPath)).toString(), "abcdef");
  await Promise.all([
    rm(path.dirname(finalPath), { recursive: true, force: true }),
    rm(tempDir, { recursive: true, force: true }),
  ]);
});

test("refuses to merge a non-contiguous chunk set", async () => {
  await assert.rejects(
    () =>
      mergeTaskChunks({
        _id: "0123456789abcdef01234567",
        ownerId: "storage-test",
        fileHash: "e".repeat(32),
        fileName: "sample.bin",
        totalSize: 6,
        chunkSize: 3,
        totalChunks: 2,
        tempDir: tmpdir(),
        uploadedChunks: [0],
      }),
    (error) =>
      error instanceof FileUploadError &&
      error.errorCode === "CHUNKS_INCOMPLETE",
  );
});

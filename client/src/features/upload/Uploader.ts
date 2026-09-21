import {
  cancelUploadTask,
  initUploadTask,
  mergeChunk,
} from "@/api/file";
import { calculateFileHash } from "./hash";
import { getHashProgressWeight } from "./progress";
import { ChunkUploadRunner } from "./chunkRunner";
import {
  UploadStatus,
  type UploadCallbacks,
  type UploadSnapshot,
} from "./model";
import {
  removeUploadSession,
  removeUploadSessionsByFingerprint,
  saveUploadSession,
} from "./session";

const getChunkSize = (fileSize: number) => {
  if (fileSize >= 1024 ** 3) return 20 * 1024 ** 2;
  if (fileSize >= 100 * 1024 ** 2) return 10 * 1024 ** 2;
  return 5 * 1024 ** 2;
};

export class Uploader {
  private status = UploadStatus.pending;
  private abortController = new AbortController();
  private mergeStarted = false;
  private uploadId?: string;
  private hash = "";
  private snapshot: UploadSnapshot = {
    status: UploadStatus.pending,
    progress: 0,
    speed: 0,
  };
  private readonly chunkSize: number;
  private readonly totalChunks: number;
  private readonly runner: ChunkUploadRunner;

  constructor(
    private readonly options: UploadCallbacks & {
      file: File;
      ownerId: string;
      folderId?: string;
      folderName?: string;
    },
  ) {
    this.chunkSize = getChunkSize(options.file.size);
    this.totalChunks = Math.ceil(options.file.size / this.chunkSize);
    this.runner = new ChunkUploadRunner({
      file: options.file,
      chunkSize: this.chunkSize,
      totalChunks: this.totalChunks,
      getUploadId: () => this.uploadId!,
      getSignal: () => this.abortController.signal,
      canRun: () => this.status === UploadStatus.uploading,
      onProgress: (progress, speed) =>
        this.emit({ progress, speed, error: undefined }),
      onError: (error) => this.fail(error),
      onComplete: () => void this.complete(),
    });
  }

  private emit(update: Partial<UploadSnapshot>) {
    this.snapshot = { ...this.snapshot, ...update, status: this.status };
    this.options.onChange?.(this.snapshot);
  }

  private setStatus(status: UploadStatus, update: Partial<UploadSnapshot> = {}) {
    this.status = status;
    this.emit(update);
  }

  private resetController() {
    if (this.abortController.signal.aborted) {
      this.abortController = new AbortController();
    }
  }

  private fail(error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") return;
    this.runner.stop();
    this.abortController.abort();
    this.abortController = new AbortController();
    const message = error instanceof Error ? error.message : "上传失败，请重试";
    this.setStatus(UploadStatus.fail, { speed: 0, error: message });
  }

  private async complete() {
    if (this.mergeStarted || !this.uploadId) return;
    this.mergeStarted = true;
    this.setStatus(UploadStatus.merging, { progress: 99, speed: 0 });
    try {
      const response = await mergeChunk(this.uploadId);
      removeUploadSession(this.options.ownerId, this.uploadId);
      this.setStatus(UploadStatus.success, { progress: 100, error: undefined });
      this.options.onFinish?.(response.data);
    } catch (error) {
      this.mergeStarted = false;
      this.fail(error);
    }
  }

  pause() {
    if (this.status !== UploadStatus.uploading) return;
    this.runner.stop();
    this.abortController.abort();
    this.abortController = new AbortController();
    this.setStatus(UploadStatus.paused, { speed: 0 });
  }

  /**
   * 身份变化时只停止本地工作，不向已经变化的账号发送取消请求。
   * @returns 无返回值。
   */
  dispose(): void {
    this.runner.stop();
    this.abortController.abort();
  }

  resume() {
    if (this.status !== UploadStatus.paused) return;
    this.resetController();
    this.setStatus(UploadStatus.uploading, { error: undefined });
    this.runner.start();
  }

  retry() {
    this.runner.stop();
    this.abortController.abort();
    this.abortController = new AbortController();
    this.mergeStarted = false;
    void this.upload();
  }

  async cancel() {
    this.runner.stop();
    this.abortController.abort();
    this.setStatus(UploadStatus.cancelled, { speed: 0 });
    try {
      if (this.uploadId) {
        await cancelUploadTask(this.uploadId);
        removeUploadSession(this.options.ownerId, this.uploadId);
      }
    } catch (error) {
      this.fail(error);
      throw error;
    }
  }

  /**
   * 校验并初始化上传，恢复已有分片后继续传输。
   * @returns 上传初始化流程完成的 Promise。
   */
  async upload(): Promise<void> {
    try {
      this.resetController();
      this.setStatus(UploadStatus.hashing, { progress: 0, error: undefined });
      // 大文件使用抽样哈希，读取量固定且几乎瞬间完成，不把哈希进度映射到进度条，
      // 避免进度 0→10% 跳变后长时间停滞；小文件仍按完整哈希进度平滑推进。
      const hashWeight = getHashProgressWeight(this.options.file.size);
      this.hash = await calculateFileHash(
        this.options.file,
        this.abortController.signal,
        (percentage) => {
          if (hashWeight === 0) return;
          this.emit({ progress: Math.round(percentage * hashWeight / 100) });
        },
      );
      this.setStatus(UploadStatus.initializing, { progress: hashWeight });
      const response = await initUploadTask({
        fileName: this.options.file.name,
        fileHash: this.hash,
        totalSize: this.options.file.size,
        chunkSize: this.chunkSize,
        totalChunks: this.totalChunks,
        folderId: this.options.folderId,
        mimeType: this.options.file.type,
      });
      if (response.data.needUpload === false) {
        removeUploadSessionsByFingerprint(
          this.options.ownerId,
          this.hash,
          this.options.file.size,
        );
        this.setStatus(UploadStatus.success, { progress: 100 });
        this.options.onFinish?.(response.data.file);
        return;
      }
      this.uploadId = response.data.uploadId;
      saveUploadSession({
        ownerId: this.options.ownerId,
        uploadId: this.uploadId,
        hash: this.hash,
        name: this.options.file.name,
        size: this.options.file.size,
        folderId: this.options.folderId,
        folderName: this.options.folderName,
        chunkSize: this.chunkSize,
        totalChunks: this.totalChunks,
        expiresAt: response.data.expiresAt,
      });
      this.runner.configure(response.data.uploadedChunks);
      this.setStatus(UploadStatus.uploading, {
        uploadId: this.uploadId,
        progress: this.runner.getProgress(),
      });
      if (this.runner.isComplete()) {
        await this.complete();
      } else {
        this.runner.start();
      }
    } catch (error) {
      this.fail(error);
    }
  }
}

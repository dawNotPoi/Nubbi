import { initUploadTask, mergeChunk, uploadChunk } from "../api/file";
import Worker from "./worker?worker";

export enum UploadStatus {
  pending = 0,
  uploading = 1,
  success = 2,
  fail = 3,
  paused = 4,
}

export enum ChunkStatus {
  pending = -1,
  uploading = 2,
  fail = 0,
  success = 1,
}

type Chunk = {
  formData?: FormData;
  retries: number;
  status: ChunkStatus;
  chunkIndex: number;
  file: Blob;
};

type HashWorkerMessage = {
  percentage?: number;
  hash?: string;
  error?: string;
};

const HASH_PERCENTAGE = 10;

export class Uploader {
  private file: File;
  private chunks: Chunk[] = [];
  private status: UploadStatus = UploadStatus.pending;
  private restSize = 6;
  private finishedCount = 0;
  private mergeStarted = false;
  private hash = "";
  private name = "";
  private size: number;
  public progress = 0;
  private uploadId: string | null = null;
  private totalChunksSize = 0;
  private uploadedBytes = 0;
  private uploadStartedAt = 0;
  private uploadSpeed = 0;
  private onChange?: (
    status: UploadStatus,
    progress: number,
    speed: number,
  ) => void;
  private onFinish?: () => void;

  constructor(options: {
    file: File;
    onChange?: (
      status: UploadStatus,
      progress: number,
      speed: number,
    ) => void;
    onFinish?: () => void;
  }) {
    this.file = options.file;
    this.name = options.file.name;
    this.onChange = options.onChange;
    this.onFinish = options.onFinish;
    this.size = Uploader.chunkSizeMB(options.file.size);
    this.totalChunksSize = this.splitFileToChunks(this.file).length;
  }

  // < 100MB → 5MB chunks, 100MB–1GB → 10MB, > 1GB → 20MB
  private static chunkSizeMB(fileSize: number): number {
    const GB = 1024 * 1024 * 1024;
    const MB100 = 100 * 1024 * 1024;
    if (fileSize >= GB) return 20;
    if (fileSize >= MB100) return 10;
    return 5;
  }

  private fail(error?: unknown) {
    if (error) {
      console.error("Upload failed", error);
    }
    this.status = UploadStatus.fail;
    this.uploadSpeed = 0;
    this.onChange?.(this.status, this.progress, this.uploadSpeed);
  }

  private emitChange() {
    this.onChange?.(this.status, this.progress, this.uploadSpeed);
  }

  private updateUploadSpeed(chunkSize: number) {
    if (!this.uploadStartedAt) {
      this.uploadStartedAt = performance.now();
    }

    this.uploadedBytes += chunkSize;

    const elapsedSeconds = Math.max(
      (performance.now() - this.uploadStartedAt) / 1000,
      0.001,
    );
    this.uploadSpeed = this.uploadedBytes / elapsedSeconds;
  }

  private getProgressFromFinishedChunks(finishedCount: number) {
    const uploadPercentage = 100 - HASH_PERCENTAGE;

    return (
      HASH_PERCENTAGE +
      Math.round((finishedCount / this.totalChunksSize) * uploadPercentage)
    );
  }

  private getHash(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const worker = new Worker();

      worker.onmessage = (event: MessageEvent<HashWorkerMessage>) => {
        const { data } = event;

        if (typeof data?.percentage === "number") {
          this.progress = Math.round(
            (data.percentage * HASH_PERCENTAGE) / 100,
          );
          this.emitChange();
        }

        if (data?.error) {
          worker.terminate();
          reject(new Error(data.error));
          return;
        }

        if (data?.hash) {
          worker.terminate();
          resolve(data.hash);
        }
      };

      worker.onerror = (event) => {
        worker.terminate();
        reject(new Error(event.message || "File hash worker failed"));
      };

      worker.postMessage(file);
    });
  }

  private splitFileToChunks(file: File, size = this.size) {
    const chunkSize = 1024 * 1024 * size;
    const chunks: Chunk[] = [];

    for (
      let start = 0, index = 0;
      start < file.size;
      start += chunkSize, index++
    ) {
      chunks.push({
        retries: 0,
        status: ChunkStatus.pending,
        chunkIndex: index,
        file: file.slice(start, start + chunkSize),
      });
    }

    return chunks;
  }

  private async start() {
    if (this.status !== UploadStatus.uploading) return;

    const totalChunks = this.totalChunksSize;
    const maxConcurrency = this.restSize;
    let stopped = false;

    const uploadNext = async () => {
      if (stopped || this.status !== UploadStatus.uploading) return;

      const chunk = this.chunks.find(
        (item) => item.status === ChunkStatus.pending,
      );
      if (!chunk) return;

      chunk.status = ChunkStatus.uploading;

      try {
        await uploadChunk(chunk.formData!);
        chunk.status = ChunkStatus.success;
        this.finishedCount++;
        this.updateUploadSpeed(chunk.file.size);
        this.progress = this.getProgressFromFinishedChunks(this.finishedCount);
        this.emitChange();

        if (this.finishedCount === totalChunks && !this.mergeStarted) {
          this.mergeStarted = true;
          await mergeChunk(this.uploadId!);
          this.status = UploadStatus.success;
          this.progress = 100;
          this.uploadSpeed = 0;
          this.emitChange();
          this.onFinish?.();
          stopped = true;
          return;
        }
      } catch (error) {
        chunk.retries++;

        if (chunk.retries >= 3) {
          chunk.status = ChunkStatus.fail;
          stopped = true;
          this.fail(error);
          return;
        }

        chunk.status = ChunkStatus.pending;
      } finally {
        if (!stopped && this.status === UploadStatus.uploading) {
          void uploadNext();
        }
      }
    };

    for (let i = 0; i < Math.min(maxConcurrency, this.chunks.length); i++) {
      void uploadNext();
    }
  }

  pause() {
    this.status = UploadStatus.paused;
    this.uploadSpeed = 0;
    this.emitChange();
  }

  resume() {
    this.status = UploadStatus.uploading;
    this.uploadStartedAt = performance.now();
    this.uploadedBytes = 0;
    this.uploadSpeed = 0;
    this.emitChange();
    void this.start();
  }

  async upload() {
    try {
      this.status = UploadStatus.uploading;
      this.uploadSpeed = 0;
      this.emitChange();
      this.finishedCount = 0;
      this.mergeStarted = false;
      this.hash = await this.getHash(this.file);

      const { data } = await initUploadTask({
        fileName: this.name,
        fileHash: this.hash,
        totalSize: String(this.file.size),
        totalChunksSize: String(this.totalChunksSize),
      });

      if (data?.needUpload === false) {
        this.status = UploadStatus.success;
        this.progress = 100;
        this.uploadSpeed = 0;
        this.emitChange();
        this.onFinish?.();
        return;
      }

      if (!("uploadId" in data)) {
        throw new Error("Upload task initialization failed");
      }

      this.uploadId = data.uploadId;
      this.finishedCount = data.uploadedChunks.length;
      this.progress = this.getProgressFromFinishedChunks(this.finishedCount);
      this.emitChange();
      this.chunks = this.splitFileToChunks(this.file)
        .filter((_, index) => !data.uploadedChunks.includes(index))
        .map((chunk) => {
          const formData = new FormData();

          formData.append("chunk", chunk.file);
          formData.append("hash", this.hash);
          formData.append("name", this.name);
          formData.append("chunkIndex", String(chunk.chunkIndex));
          formData.append("uploadId", data.uploadId);

          return {
            ...chunk,
            formData,
          };
        });

      if (this.chunks.length === 0) {
        await mergeChunk(this.uploadId);
        this.status = UploadStatus.success;
        this.progress = 100;
        this.uploadSpeed = 0;
        this.emitChange();
        this.onFinish?.();
        return;
      }

      this.uploadStartedAt = performance.now();
      this.uploadedBytes = 0;
      this.uploadSpeed = 0;
      void this.start();
    } catch (error) {
      this.fail(error);
    }
  }
}

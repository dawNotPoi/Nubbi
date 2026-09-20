import { uploadChunk } from "@/api/file";
import { ChunkStatus } from "./model";
import { uploadPool } from "./pool";
import { uploadWithRetry } from "./retry";
import { getUploadProgress } from "./progress";

type Chunk = { index: number; blob: Blob; status: ChunkStatus };
const PER_FILE_CONCURRENCY = 3;

export class ChunkUploadRunner {
  private chunks: Chunk[] = [];
  private generation = 0;
  private confirmedBytes = 0;
  private startedAt = 0;

  constructor(
    private readonly options: {
      file: File;
      chunkSize: number;
      totalChunks: number;
      getUploadId: () => string;
      getSignal: () => AbortSignal;
      canRun: () => boolean;
      onProgress: (progress: number, speed: number) => void;
      onError: (error: unknown) => void;
      onComplete: () => void;
    },
  ) {}

  configure(uploadedChunks: number[]) {
    const uploaded = new Set(uploadedChunks);
    this.chunks = Array.from(
      { length: this.options.totalChunks },
      (_, index) => ({
        index,
        blob: this.options.file.slice(
          index * this.options.chunkSize,
          Math.min(
            (index + 1) * this.options.chunkSize,
            this.options.file.size,
          ),
        ),
        status: uploaded.has(index)
          ? ChunkStatus.success
          : ChunkStatus.pending,
      }),
    );
  }

  isComplete() {
    return this.chunks.every((chunk) => chunk.status === ChunkStatus.success);
  }

  stop() {
    this.generation++;
    this.chunks.forEach((chunk) => {
      if (chunk.status === ChunkStatus.uploading) chunk.status = ChunkStatus.pending;
    });
  }

  start() {
    const generation = ++this.generation;
    this.startedAt = performance.now();
    this.confirmedBytes = 0;
    void Promise.all(
      Array.from({ length: PER_FILE_CONCURRENCY }, () =>
        this.workerLoop(generation),
      ),
    ).then(() => {
      if (
        generation === this.generation &&
        this.options.canRun() &&
        this.isComplete()
      ) {
        this.options.onComplete();
      }
    });
  }

  /**
   * 读取已确认分片进度，初始化续传时立即恢复到服务端已有进度。
   * @returns 分片阶段的展示百分比。
   */
  getProgress(): number {
    const completed = this.chunks.filter(
      (item) => item.status === ChunkStatus.success,
    ).length;
    return getUploadProgress(
      this.options.file.size,
      completed,
      this.options.totalChunks,
    );
  }

  /**
   * 仅在分片确认成功后推进进度，速度按本轮实际上传量计算。
   * @param chunk 刚完成的分片。
   * @returns 无返回值。
   */
  private reportProgress(chunk: Chunk): void {
    this.confirmedBytes += chunk.blob.size;
    const elapsed = Math.max((performance.now() - this.startedAt) / 1000, 0.001);
    this.options.onProgress(this.getProgress(), this.confirmedBytes / elapsed);
  }

  private async uploadOne(chunk: Chunk, generation: number) {
    chunk.status = ChunkStatus.uploading;
    await uploadPool.acquire();
    try {
      if (generation !== this.generation || !this.options.canRun()) {
        chunk.status = ChunkStatus.pending;
        return;
      }
      const formData = new FormData();
      formData.append("chunk", chunk.blob);
      formData.append("chunkIndex", String(chunk.index));
      formData.append("uploadId", this.options.getUploadId());
      await uploadWithRetry(
        (signal) => uploadChunk(formData, signal),
        this.options.getSignal(),
      );
      chunk.status = ChunkStatus.success;
      this.reportProgress(chunk);
    } catch (error) {
      chunk.status = ChunkStatus.pending;
      this.options.onError(error);
    } finally {
      uploadPool.release();
    }
  }

  private async workerLoop(generation: number) {
    while (generation === this.generation && this.options.canRun()) {
      const chunk = this.chunks.find((item) => item.status === ChunkStatus.pending);
      if (!chunk) return;
      await this.uploadOne(chunk, generation);
    }
  }
}

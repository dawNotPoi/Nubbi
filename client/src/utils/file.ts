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

//鍝堝笇璁＄畻鍗犳嵁鐨勮繘搴︾櫨鍒嗘瘮,浣跨敤鏁存暟
const HASH_PERCENTAGE = 10;

//鏂囦欢涓婁紶绫?鐢ㄤ簬绠＄悊鏂囦欢涓婁紶鐨勭姸鎬?
export class Uploader {
  private file: File; //涓婁紶鐨勬枃浠舵暟鎹?
  private chunks: Chunk[] = [];
  private status: UploadStatus = UploadStatus.pending;
  private RestSize = 6; //鍒嗙墖涓婁紶闄愬埗 涓€鑸祻瑙堝櫒鍏佽鍚屾椂瀛樺湪鐨勮姹傛暟涓?
  private finishedCount = 0; //宸蹭笂浼犲垎鐗囨暟閲?
  private hash = "";
  private name = "";
  private size = 5; //鍒嗙墖澶у皬 MB
  public progress = 0;
  private uploadId: string | null = null;
  private totalChunksSize = 0;
  //涓婁紶鐘舵€佹敼鍙樻椂瑙﹀彂
  private onChange?: (status: UploadStatus, progress: number) => void;
  //涓婁紶瀹屾垚鏃惰Е鍙?
  private onFinish?: () => void;
  constructor(options: {
    file: File;
    onChange?: (status: UploadStatus, progress: number) => void;
    onFinish?: () => void;
  }) {
    this.file = options.file;
    this.name = options.file.name;
    this.onChange = options?.onChange;
    this.onFinish = options?.onFinish;
    this.totalChunksSize = this.splitFileToChunks(this.file).length;
  }

  //璁＄畻鏂囦欢hash
  private getHash(file: File): Promise<string> {
    return new Promise((resolve) => {
      const worker = new Worker();
      worker.onmessage = (event) => {
        const { data } = event;
        if (data?.percentage) {
          this.progress = Math.round((data.percentage * HASH_PERCENTAGE) / 100); // Hash璁＄畻鍗犳€昏繘搴?0%
          this.onChange?.(this.status, this.progress);
        }
        if (data?.hash) {
          resolve(data?.hash);
          worker.terminate();
        }
      };
      worker.postMessage(file);
    });
  }
  // 杩涜鏂囦欢鍒嗙墖
  private splitFileToChunks(file: File, size = this.size) {
    const chunkSize = 1024 * 1024 * size;
    const chunks: Chunk[] = [];
    for (
      let start = 0, index = 0;
      start < file.size;
      start += chunkSize, index++
    ) {
      const blob = file.slice(start, start + chunkSize); //瓒呰繃閮ㄥ垎锛屽彇鍒扮粨灏?
      chunks.push({
        retries: 0,
        status: ChunkStatus.pending,
        chunkIndex: index,
        file: blob,
      });
    }
    return chunks;
  }

  //鍚庣画瑕佺湅涓€涓嬶紝鍙兘瀛樺湪骞跺彂鎺у埗闂
  private async start() {
    if (this.status !== UploadStatus.uploading) return;
    const len = this.chunks.length;
    const maxConcurrency = this.RestSize;
    let activeCount = 0;
    let stopped = false;
    const uploadNext = async () => {
      if (stopped || this.status !== UploadStatus.uploading) return;
      const chunk = this.chunks.find(
        (item) => item.status === ChunkStatus.pending,
      );
      if (!chunk) return;
      activeCount++;
      try {
        await uploadChunk(chunk.formData!);
        chunk.status = ChunkStatus.success;
        this.finishedCount++;
        // 鏇存柊杩涘害
        const UPLOAD_PERCENTAGE = 100 - HASH_PERCENTAGE;
        this.progress =
          HASH_PERCENTAGE +
          Math.round((this.finishedCount / len) * UPLOAD_PERCENTAGE);
        this.onChange?.(this.status, this.progress);
        console.log(this.finishedCount, len);

        // 妫€鏌ユ槸鍚﹀叏閮ㄥ畬鎴?
        if (this.finishedCount === len) {
          await mergeChunk(this.uploadId!);
          this.status = UploadStatus.success;
          this.progress = 100;
          this.onChange?.(this.status, this.progress);
          this.onFinish?.();
          stopped = true;
          return;
        }
      } catch (err) {
        chunk.retries++;
        if (chunk.retries >= 3) {
          this.status = UploadStatus.fail;
          this.onChange?.(this.status, this.progress);
          stopped = true;
          return;
        } else {
          chunk.status = ChunkStatus.pending; // 澶辫触閲嶈瘯
        }
      } finally {
        activeCount--;
        // 缁х画涓婁紶涓嬩竴涓?
        if (!stopped && this.status === UploadStatus.uploading) {
          uploadNext();
        }
      }
    };
    // 鍚姩鏈€澶у苟鍙戞暟鐨勪笂浼?
    for (let i = 0; i < Math.min(maxConcurrency, len); i++) {
      uploadNext();
    }
  }

  pause() {
    this.status = UploadStatus.paused;
    this.onChange?.(this.status, this.progress);
  }

  resume() {
    this.status = UploadStatus.uploading;
    this.onChange?.(this.status, this.progress);
    this.start();
  }

  async upload() {
    this.status = UploadStatus.uploading;
    this.onChange?.(this.status, this.progress);
    this.hash = await this.getHash(this.file);
    const { data } = await initUploadTask({
      fileName: this.name,
      fileHash: this.hash,
      totalSize: this.file.size + "",
      totalChunksSize: this.totalChunksSize + "",
    });
    //涓嶉渶瑕佸啀娆′笂浼?
    if (data?.needUpload == false) {
      this.status = UploadStatus.success;
      this.progress = 100;
      this.onChange?.(this.status, this.progress);
      this.onFinish?.();
      return;
    }
    //涓嶅瓨鍦ㄥ垯寮€濮嬩笂浼?
    if (!("uploadId" in data)) return;
    this.uploadId = data.uploadId;
    const uploadedChunksIndex = data.uploadedChunks;
    const AllChunks = this.splitFileToChunks(this.file);
    this.chunks = AllChunks.filter((_, index) => {
      if (uploadedChunksIndex.includes(index)) return false;
      return true;
    }).map((chunk) => {
      const formData = new FormData();
      formData.append("chunk", chunk.file);
      formData.append("hash", this.hash);
      formData.append("name", this.name);
      formData.append("chunkIndex", chunk.chunkIndex + "");
      formData.append("uploadId", data.uploadId);
      return {
        ...chunk,
        formData,
      };
    });

    //鍏ㄩ儴涓婁紶瀹屾垚璇锋眰鍚堝苟
    if (this.chunks.length === 0) {
      await mergeChunk(this.uploadId!);
      this.status = UploadStatus.success;
      this.progress = 100;
      this.onChange?.(this.status, this.progress);
      this.onFinish?.();
    } else this.start();
  }
}



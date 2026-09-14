import { checkFile, mergeChunk, uploadChunk } from "../api/file";
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
  formData: FormData;
  retries: number;
  status: ChunkStatus;
  index: number;
};

//哈希计算占据的进度百分比,使用整数
const HASH_PERCENTAGE = 10;

//文件上传类,用于管理文件上传的状态
export class Uploader {
  private file: File; //上传的文件数据
  private chunks: Chunk[] = [];
  private status: UploadStatus = UploadStatus.pending;
  private RestSize = 6; //分片上传限制 一般浏览器允许同时存在的请求数为6
  private finishedCount = 0; //已上传分片数量
  private hash = "";
  private name = "";
  private size = 5; //分片大小 MB
  public progress = 0;
  //上传状态改变时触发
  private onChange?: (status: UploadStatus, progress: number) => void;
  //上传完成时触发
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
  }

  //计算文件hash
  private getHash(file: File): Promise<string> {
    return new Promise((resolve) => {
      const worker = new Worker();
      worker.onmessage = (event) => {
        const { data } = event;
        if (data?.percentage) {
          this.progress = Math.round((data.percentage * HASH_PERCENTAGE) / 100); // Hash计算占总进度20%
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
  // 进行文件分片
  private splitFileToChunk(
    file: File,
    hash: string,
    name: string,
    size = this.size
  ) {
    const chunkSize = 1024 * 1024 * size;
    const chunks: Chunk[] = [];
    for (
      let start = 0, index = 0;
      start < file.size;
      start += chunkSize, index++
    ) {
      const blob = file.slice(start, start + chunkSize); //超过部分，取到结尾
      const formData = new FormData();
      console.log(blob);
      formData.append("file", blob);
      formData.append("hash", hash);
      formData.append("name", name);
      formData.append("type", "file");
      formData.append("index", index.toString());
      formData.append("size", chunkSize.toString());
      formData.append("start", start.toString());
      chunks.push({
        formData,
        retries: 0,
        status: ChunkStatus.pending,
        index: index,
      });
    }
    return chunks;
  }

  //后续要看一下，可能存在并发控制问题
  private async start() {
    if (this.status !== UploadStatus.uploading) return;
    const len = this.chunks.length;
    const maxConcurrency = this.RestSize;
    let activeCount = 0;
    let stopped = false;
    const uploadNext = async () => {
      if (stopped || this.status !== UploadStatus.uploading) return;
      const chunk = this.chunks.find(
        (item) => item.status === ChunkStatus.pending
      );
      if (!chunk) return;
      activeCount++;
      console.log(chunk);
      try {
        const res = await uploadChunk(chunk.formData);
        chunk.status = ChunkStatus.success;
        this.finishedCount++;
        // 更新进度
        const UPLOAD_PERCENTAGE = 100 - HASH_PERCENTAGE;
        this.progress =
          HASH_PERCENTAGE +
          Math.round((this.finishedCount / len) * UPLOAD_PERCENTAGE);
        this.onChange?.(this.status, this.progress);
        // 检查是否全部完成
        if (this.finishedCount === len) {
          await mergeChunk({ hash: this.hash, name: this.name });
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
          chunk.status = ChunkStatus.pending; // 失败重试
        }
      } finally {
        activeCount--;
        // 继续上传下一个
        if (!stopped && this.status === UploadStatus.uploading) {
          uploadNext();
        }
      }
    };
    // 启动最大并发数的上传
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
    const { data: checkRes } = await checkFile(this.hash, this.name);
    console.log(checkRes);
    //不需要再次上传
    if (checkRes.needUpload == false) {
      this.status = UploadStatus.success;
      this.progress = 100;
      this.onChange?.(this.status, this.progress);
      this.onFinish?.();
      return;
    }
    //不存在则开始上传
    this.chunks = this.splitFileToChunk(this.file, this.hash, this.name);
    this.start();
  }
}

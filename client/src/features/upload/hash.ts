import Worker from "@/utils/worker?worker";

type HashWorkerMessage = {
  percentage?: number;
  hash?: string;
  error?: string;
};

export const calculateFileHash = (
  file: File,
  signal: AbortSignal,
  onProgress: (percentage: number) => void,
) =>
  new Promise<string>((resolve, reject) => {
    const worker = new Worker();
    const abort = () => {
      worker.terminate();
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal.addEventListener("abort", abort, { once: true });

    worker.onmessage = (event: MessageEvent<HashWorkerMessage>) => {
      const { data } = event;
      if (typeof data?.percentage === "number") onProgress(data.percentage);
      if (data?.error) {
        signal.removeEventListener("abort", abort);
        worker.terminate();
        reject(new Error(data.error));
      } else if (data?.hash) {
        signal.removeEventListener("abort", abort);
        worker.terminate();
        resolve(data.hash);
      }
    };
    worker.onerror = (event) => {
      signal.removeEventListener("abort", abort);
      worker.terminate();
      reject(new Error(event.message || "文件 hash 计算失败"));
    };
    worker.postMessage(file);
  });

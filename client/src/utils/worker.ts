import SparkMD5 from "spark-md5";

const HASH_CHUNK_SIZE = 2 * 1024 * 1024;

const readAsArrayBuffer = (blob: Blob) => {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const result = event.target?.result;

      if (result instanceof ArrayBuffer) {
        resolve(result);
        return;
      }

      reject(new Error("File chunk read failed"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("File read error"));
    reader.readAsArrayBuffer(blob);
  });
};

const calculateFileHash = async (file: File) => {
  const spark = new SparkMD5.ArrayBuffer();
  const chunkCount = Math.ceil(file.size / HASH_CHUNK_SIZE);

  for (let index = 0; index < chunkCount; index++) {
    const start = index * HASH_CHUNK_SIZE;
    const end = Math.min(start + HASH_CHUNK_SIZE, file.size);
    const buffer = await readAsArrayBuffer(file.slice(start, end));

    spark.append(buffer);
    postMessage({
      percentage: Math.round(((index + 1) / chunkCount) * 100),
    });
  }

  return spark.end();
};

onmessage = (event: MessageEvent<File>) => {
  calculateFileHash(event.data)
    .then((hash) => {
      postMessage({
        percentage: 100,
        hash,
      });
    })
    .catch((error) => {
      postMessage({
        error:
          error instanceof Error ? error.message : "File hash calculation failed",
      });
    });
};

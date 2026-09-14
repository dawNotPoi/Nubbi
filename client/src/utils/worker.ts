import SparkMD5 from "spark-md5";

const SMALL_FILE_THRESHOLD = 100 * 1024 * 1024; // 100MB
const FULL_HASH_CHUNK_SIZE = 2 * 1024 * 1024;   // 2MB per read for full hash
const SAMPLE_SIZE = 1 * 1024 * 1024;             // 1MB per sample point
const MIDDLE_SAMPLE_COUNT = 12;                  // evenly-spaced middle samples

const readAsArrayBuffer = (blob: Blob): Promise<ArrayBuffer> => {
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

const calculateFullHash = async (file: File): Promise<string> => {
  const spark = new SparkMD5.ArrayBuffer();
  const chunkCount = Math.ceil(file.size / FULL_HASH_CHUNK_SIZE);

  for (let index = 0; index < chunkCount; index++) {
    const start = index * FULL_HASH_CHUNK_SIZE;
    const end = Math.min(start + FULL_HASH_CHUNK_SIZE, file.size);
    const buffer = await readAsArrayBuffer(file.slice(start, end));
    spark.append(buffer);
    postMessage({ percentage: Math.round(((index + 1) / chunkCount) * 100) });
  }

  return spark.end();
};

// Sample head + evenly-spaced middle points + tail.
// Mix in file size and filename to eliminate trivial collision cases.
// Total data read ≈ (2 + MIDDLE_SAMPLE_COUNT) × SAMPLE_SIZE regardless of file size.
const calculateSampledHash = async (file: File): Promise<string> => {
  const spark = new SparkMD5.ArrayBuffer();

  // Mix file size to distinguish files that share identical sample bytes
  const meta = new TextEncoder().encode(String(file.size));
  spark.append(meta.buffer);

  const positions: Array<[number, number]> = [];

  // Head
  positions.push([0, SAMPLE_SIZE]);

  // Middle samples, evenly distributed between head and tail regions
  const middleStart = SAMPLE_SIZE;
  const middleEnd = file.size - SAMPLE_SIZE;
  for (let i = 0; i < MIDDLE_SAMPLE_COUNT; i++) {
    const offset = Math.floor(
      middleStart + (i / MIDDLE_SAMPLE_COUNT) * (middleEnd - middleStart),
    );
    positions.push([offset, offset + SAMPLE_SIZE]);
  }

  // Tail
  positions.push([file.size - SAMPLE_SIZE, file.size]);

  const total = positions.length;
  for (let i = 0; i < total; i++) {
    const [start, end] = positions[i];
    const buffer = await readAsArrayBuffer(file.slice(start, end));
    spark.append(buffer);
    postMessage({ percentage: Math.round(((i + 1) / total) * 100) });
  }

  return spark.end();
};

onmessage = (event: MessageEvent<File>) => {
  const file = event.data;
  const calculate =
    file.size < SMALL_FILE_THRESHOLD ? calculateFullHash : calculateSampledHash;

  calculate(file)
    .then((hash) => {
      postMessage({ percentage: 100, hash });
    })
    .catch((error) => {
      postMessage({
        error:
          error instanceof Error ? error.message : "File hash calculation failed",
      });
    });
};

  import SparkMD5 from "spark-md5";
const spark = new SparkMD5.ArrayBuffer();

// 计算大文件
const calPickFile = (file: File, offset = 1 * 1024 * 1024) => {
  const size = file.size;
  const chunks: Blob[] = [];
  let cur = offset;
  // 取第一块
  chunks.push(file.slice(0, cur));
  while (cur < size) {
    if (cur + offset >= size) {
      //取最后一块
      chunks.push(file.slice(cur, size));
    } else {
      const mid = cur + offset / 2;
      const last = cur + offset;
      // 取分片的前中后二比特
      chunks.push(file.slice(cur, cur + 2));
      chunks.push(file.slice(mid, mid + 2));
      chunks.push(file.slice(last - 2, last));
      // 看情况要不要给hash计算进度
      postMessage({
        percentage: (cur / size) * 100,
      });
    }
    cur += offset;
  }
  return chunks;
};

// 大文件抽样hash  小文件进行全量hash
onmessage = function (event) {
  const calFileHash = async (file: File) => {
    const size = file.size;
    let chunks: Blob[] = [];
    const reader = new FileReader();
    return new Promise((resolve) => {
      // 大于500mb使用抽样小文件使用全样
      if (size > 500 * 1024 * 1024) {
        chunks = calPickFile(file);
      } else chunks = [file];
      reader.onload = (e) => {
        if (!e.target) {
          console.log("empty file");
          return;
        }
        spark.append(e.target.result as ArrayBuffer);
        resolve(spark.end());
      };
      reader.readAsArrayBuffer(new Blob(chunks));
    });
  };
  const { data }: { data: File } = event;
  calFileHash(data).then((res) => {
    postMessage({
      percentage: 100,
      hash: res,
    });
  });
};

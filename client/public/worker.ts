import SparkMD5 from "spark-md5";

const getHash = (file: File) => {
  return new Promise((resolve) => {
    const fileReader = new FileReader();
    if (!file) return;
    fileReader.readAsArrayBuffer(file);
    fileReader.onload = function (e) {
      if (!e.target!.result) return;
      const fileMd5 = SparkMD5.ArrayBuffer.hash(
        e.target!.result as ArrayBuffer
      );
      resolve(fileMd5);
    };
  });
};

onmessage = function (event) {
  const { data } = event;
  console.log("worker", data);
  postMessage("1");
};

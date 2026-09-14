/** 文件上传业务异常：携带 HTTP 状态码和错误码 */
export class FileUploadError extends Error {
  status: number;
  errorCode: string;

  constructor(status: number, errorCode: string, message: string) {
    super(message);
    this.name = "FileUploadError";
    this.status = status;
    this.errorCode = errorCode;
  }
}

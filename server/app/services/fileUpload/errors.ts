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

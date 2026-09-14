export type InitUploadInput = {
  fileName: string;
  fileHash: string;
  totalSize: number;
  chunkSize: number;
  totalChunks: number;
  folderId?: string | null;
  mimeType?: string;
};

export type UploadChunkInput = {
  uploadId: string;
  chunkIndex: number;
};

export type StoreUploadChunkInput = UploadChunkInput & {
  ownerId: string;
  incomingFile: Express.Multer.File;
};

export type UploadTaskStatus =
  | "uploading"
  | "merging"
  | "completed"
  | "failed";

export type UploadedFileDto = {
  _id: string;
  name: string;
  size: number;
  folderId: string | null;
  mimeType?: string;
  extension?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type UploadProgressDto = {
  needUpload: true;
  status: UploadTaskStatus;
  uploadId: string;
  uploadedChunks: number[];
  expiresAt: string;
};

export type InitializeUploadResult =
  | UploadProgressDto
  | { needUpload: false; file: UploadedFileDto };

export type UploadTaskStatusDto = {
  uploadId: string;
  fileName: string;
  totalSize: number;
  folderId: string | null;
  uploadedChunks: number[];
  totalChunks: number;
  chunkSize: number;
  status: UploadTaskStatus;
  error: string | null | undefined;
  expiresAt: Date;
  file: UploadedFileDto | null;
};

export type StoreUploadChunkResult = {
  chunkIndex: number;
};

export type CancelUploadResult = {
  cancelled: boolean;
};

export interface RemoteFileRecord {
  _id: string;
  name: string;
  type: string;
  updatedAt: string;
  path: string;
}

export type FileId = RemoteFileRecord["_id"];

export interface FolderEntry {
  kind: "folder";
  name: string;
  pathParts: string[];
  fileCount: number;
}

export interface FileEntry {
  kind: "file";
  file: RemoteFileRecord;
  baseName: string;
  dirParts: string[];
  fullName: string;
}

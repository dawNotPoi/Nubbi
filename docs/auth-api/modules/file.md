# File 模块接口

## 类型速览

```ts
type SuccessEnvelope<T> = {
  code: 1;
  message: string;
  data: T;
};

type FileDocument = {
  _id: string;
  name: string;
  extension?: string;
  mimeType?: string;
  size: string;
  hash: string;
  folderId: string | null;
  ownerId: string;
  storagePath: string;
  status: "active" | "recycled" | "processing";
  createdAt: string | Date;
  updatedAt: string | Date;
};

type FolderDocument = {
  _id: string;
  name: string;
  parentId: string | null;
  path: string;
  ownerId: string;
  createdAt: string | Date;
  updatedAt: string | Date;
};
```

### `POST /file/init`

- 鉴权要求：需要登录
- 源码：[server/app/routes/file.ts](/e:/Code/D-NOTE/server/app/routes/file.ts)
- 作用：初始化上传任务；如果命中秒传条件，会直接创建逻辑文件并跳过上传

请求参数：

```ts
type Body = {
  fileName: string;
  fileHash: string;
  totalSize: string | number;
  totalChunksSize: number;
  folderId?: string;
};
```

成功响应：

```ts
type FileInitResult =
  | SuccessEnvelope<{ needUpload: false }>
  | SuccessEnvelope<{
      status: "UPLOADING";
      uploadId: string;
      uploadedChunks: number[];
    }>;
```

常见错误：

- `401` 未登录
- `403` `folderId` 不属于当前用户
- `500` 初始化失败

后端流程图：

```mermaid
flowchart TD
  A([收到请求]) --> B[requireAuth]
  B --> C{已登录?}
  C -- 否 --> Z([返回 401])
  C -- 是 --> D{带 folderId?}
  D -- 是 --> E[校验 Folder.ownerId]
  E --> F{有权限?}
  F -- 否 --> Y([返回 403])
  F -- 是 --> G[按 fileHash 查全局文件]
  D -- 否 --> G
  G --> H{命中秒传?}
  H -- 是 --> I[直接创建 File 记录]
  I --> J([返回 needUpload false])
  H -- 否 --> K[查找或创建 UploadTask]
  K --> L([返回 uploadId 和 uploadedChunks])
```

### `POST /file/uploadchunk`

- 鉴权要求：需要登录
- 源码：[server/app/routes/file.ts](/e:/Code/D-NOTE/server/app/routes/file.ts)
- 作用：上传单个分片文件，并记录该分片已完成

请求参数：

```ts
type Body = FormData<{
  uploadId: string;
  chunkIndex: number;
  chunk: File;
}>;
```

成功响应：

```ts
type Response = {
  success: true;
};
```

常见错误：

- `401` 未登录
- `400` 缺少分片文件
- `404` 上传任务不存在或不属于当前用户

后端流程图：

```mermaid
flowchart TD
  A([收到请求]) --> B[requireAuth]
  B --> C{已登录?}
  C -- 否 --> Z([返回 401])
  C -- 是 --> D[multer 解析 chunk]
  D --> E{req.file 存在?}
  E -- 否 --> Y([返回 400])
  E -- 是 --> F[按 uploadId 和 ownerId 查 UploadTask]
  F --> G{任务存在?}
  G -- 否 --> X([删除临时文件并返回 404])
  G -- 是 --> H[把分片移动到 tempDir]
  H --> I[更新 uploadedChunks]
  I --> J([返回 success true])
```

### `POST /file/merge`

- 鉴权要求：需要登录
- 源码：[server/app/routes/file.ts](/e:/Code/D-NOTE/server/app/routes/file.ts)
- 作用：在全部分片完成后合并文件，清理临时任务，并落库成正式文件

请求参数：

```ts
type Body = {
  uploadId: string;
};
```

成功响应：

```ts
type Response = {
  success: true;
  file: FileDocument;
};
```

常见错误：

- `401` 未登录
- `400` 分片数量异常或分片不完整
- `500` 合并失败或写盘失败

后端流程图：

```mermaid
flowchart TD
  A([收到请求]) --> B[requireAuth]
  B --> C{已登录?}
  C -- 否 --> Z([返回 401])
  C -- 是 --> D[按 uploadId 和 ownerId 查 UploadTask]
  D --> E{任务存在且分片完整?}
  E -- 否 --> Y([返回 400])
  E -- 是 --> F{最终文件已存在?}
  F -- 否 --> G[按顺序合并所有 chunk]
  F -- 是 --> H[跳过物理合并]
  G --> H
  H --> I[删除临时目录和 UploadTask]
  I --> J[创建 File 文档]
  J --> K([返回 success true 和 file])
```

### `POST /file/delete`

- 鉴权要求：需要登录
- 源码：[server/app/routes/file.ts](/e:/Code/D-NOTE/server/app/routes/file.ts)
- 作用：删除单个文件或文件夹，并在需要时清理孤立物理文件

请求参数：

```ts
type Body = {
  fileId?: string;
  kind?: "file" | "folder";
};
```

成功响应：

```ts
type Response = SuccessEnvelope<{
  deletedFileCount: number;
  deletedFolderCount: number;
  missingFileIds: string[];
  missingFolderIds: string[];
}>;
```

常见错误：

- `401` 未登录
- `400` `fileId` 为空
- `404` 文件不存在或无权操作

后端流程图：

```mermaid
flowchart TD
  A([收到请求]) --> B[requireAuth]
  B --> C{已登录?}
  C -- 否 --> Z([返回 401])
  C -- 是 --> D{fileId 存在?}
  D -- 否 --> Y([返回 400])
  D -- 是 --> E[resolveDeleteTargets]
  E --> F{存在可删除对象?}
  F -- 否 --> X([返回 404])
  F -- 是 --> G[删除 File 和 Folder 文档]
  G --> H[removeOrphanedStorageFiles]
  H --> I([successResponse 返回统计结果])
```

### `POST /file/delete-batch`

- 鉴权要求：需要登录
- 源码：[server/app/routes/file.ts](/e:/Code/D-NOTE/server/app/routes/file.ts)
- 作用：批量删除多个文件或文件夹

请求参数：

```ts
type Body = {
  fileIds?: string[];
  targets?: Array<{
    id: string;
    kind: "file" | "folder";
  }>;
};
```

成功响应：

```ts
type Response = SuccessEnvelope<{
  deletedCount: number;
  deletedFileCount: number;
  deletedFolderCount: number;
  deletedIds: string[];
  missingFileIds: string[];
  missingFolderIds: string[];
}>;
```

常见错误：

- `401` 未登录
- `400` `targets` 为空
- `404` 不存在任何可删除对象

后端流程图：

```mermaid
flowchart TD
  A([收到请求]) --> B[requireAuth]
  B --> C{已登录?}
  C -- 否 --> Z([返回 401])
  C -- 是 --> D[标准化 fileIds 或 targets]
  D --> E{至少有一个目标?}
  E -- 否 --> Y([返回 400])
  E -- 是 --> F[resolveDeleteTargets]
  F --> G{存在可删除对象?}
  G -- 否 --> X([返回 404])
  G -- 是 --> H[删除文档和孤立物理文件]
  H --> I([successResponse 返回批量统计])
```

### `POST /file/list`

- 鉴权要求：需要登录
- 源码：[server/app/routes/file.ts](/e:/Code/D-NOTE/server/app/routes/file.ts)
- 作用：列出当前目录下的文件和文件夹

请求参数：

```ts
type Body = {
  parentId?: string | "root";
};
```

成功响应：

```ts
type Response = SuccessEnvelope<{
  folders: FolderDocument[];
  files: FileDocument[];
}>;
```

常见错误：

- `401` 未登录
- `500` 查询失败

后端流程图：

```mermaid
flowchart TD
  A([收到请求]) --> B[requireAuth]
  B --> C{已登录?}
  C -- 否 --> Z([返回 401])
  C -- 是 --> D[把 root 映射成 null parentId]
  D --> E[按 ownerId 查询 Folder]
  E --> F[按 ownerId 查询 File]
  F --> G([successResponse 返回 folders 和 files])
```

### `POST /file/createfolder`

- 鉴权要求：需要登录
- 源码：[server/app/routes/file.ts](/e:/Code/D-NOTE/server/app/routes/file.ts)
- 作用：创建文件夹

请求参数：

```ts
type Body = {
  name: string;
  parentId?: string;
};
```

成功响应：

```ts
type Response = SuccessEnvelope<FolderDocument>;
```

常见错误：

- `401` 未登录
- `500` 创建失败

后端流程图：

```mermaid
flowchart TD
  A([收到请求]) --> B[requireAuth]
  B --> C{已登录?}
  C -- 否 --> Z([返回 401])
  C -- 是 --> D[Folder.create]
  D --> E([successResponse 返回 folder])
```

### `GET /file/folders`

- 鉴权要求：需要登录
- 源码：[server/app/routes/file.ts](/e:/Code/D-NOTE/server/app/routes/file.ts)
- 作用：查询当前用户的所有文件夹

请求参数：

```ts
type Query = {};
```

成功响应：

```ts
type Response = SuccessEnvelope<FolderDocument[]>;
```

常见错误：

- `401` 未登录
- `500` 查询失败

后端流程图：

```mermaid
flowchart TD
  A([收到请求]) --> B[requireAuth]
  B --> C{已登录?}
  C -- 否 --> Z([返回 401])
  C -- 是 --> D[Folder.find ownerId]
  D --> E([successResponse 返回 folders])
```

### `POST /file/rename`

- 鉴权要求：需要登录
- 源码：[server/app/routes/file.ts](/e:/Code/D-NOTE/server/app/routes/file.ts)
- 作用：重命名文件或文件夹

请求参数：

```ts
type Body = {
  _id: string;
  name: string;
  kind?: "file" | "folder";
};
```

成功响应：

```ts
type Response = SuccessEnvelope<FileDocument | FolderDocument>;
```

常见错误：

- `401` 未登录
- `400` `_id` 或 `name` 为空
- `404` 对象不存在或无权操作

后端流程图：

```mermaid
flowchart TD
  A([收到请求]) --> B[requireAuth]
  B --> C{已登录?}
  C -- 否 --> Z([返回 401])
  C -- 是 --> D{_id 和 name 合法?}
  D -- 否 --> Y([返回 400])
  D -- 是 --> E{kind == folder?}
  E -- 是 --> F[findOneAndUpdate Folder]
  E -- 否 --> G[findOneAndUpdate File]
  F --> H([successResponse 返回对象])
  G --> H
```

### `POST /file/move`

- 鉴权要求：需要登录
- 源码：[server/app/routes/file.ts](/e:/Code/D-NOTE/server/app/routes/file.ts)
- 作用：移动文件或文件夹到目标目录

请求参数：

```ts
type Body = {
  _id: string;
  kind?: "file" | "folder";
  targetFolderId: string;
};
```

成功响应：

```ts
type Response = SuccessEnvelope<FileDocument | FolderDocument>;
```

常见错误：

- `401` 未登录
- `400` 参数缺失或非法移动
- `404` 源对象或目标文件夹不存在

后端流程图：

```mermaid
flowchart TD
  A([收到请求]) --> B[requireAuth]
  B --> C{已登录?}
  C -- 否 --> Z([返回 401])
  C -- 是 --> D[查目标文件夹]
  D --> E{目标存在?}
  E -- 否 --> Y([返回 404])
  E -- 是 --> F{kind == folder?}
  F -- 否 --> G[更新 File.folderId]
  F -- 是 --> H[检查自移动和子孙目录冲突]
  H --> I{通过?}
  I -- 否 --> X([返回 400])
  I -- 是 --> J[更新 Folder.parentId]
  G --> K([successResponse 返回对象])
  J --> K
```

### `GET /file/download/:fileId`

- 鉴权要求：需要登录
- 源码：[server/app/routes/file.ts](/e:/Code/D-NOTE/server/app/routes/file.ts)
- 作用：下载当前用户拥有的文件

请求参数：

```ts
type PathParams = {
  fileId: string;
};
```

成功响应：

```ts
type Response = BinaryDownloadStream;
```

常见错误：

- `401` 未登录
- `404` 文件不存在、无权访问或物理文件缺失

后端流程图：

```mermaid
flowchart TD
  A([收到请求]) --> B[requireAuth]
  B --> C{已登录?}
  C -- 否 --> Z([返回 401])
  C -- 是 --> D[getOwnedActiveFile]
  D --> E{文件存在且归属当前用户?}
  E -- 否 --> Y([返回 404])
  E -- 是 --> F{物理文件存在?}
  F -- 否 --> X([返回 404])
  F -- 是 --> G[res.download]
  G --> H([发送下载流])
```

### `GET /file/preview/:fileId`

- 鉴权要求：需要登录
- 源码：[server/app/routes/file.ts](/e:/Code/D-NOTE/server/app/routes/file.ts)
- 作用：以内联方式预览当前用户拥有的文件

请求参数：

```ts
type PathParams = {
  fileId: string;
};
```

成功响应：

```ts
type Response = BinaryInlineStream;
```

常见错误：

- `401` 未登录
- `404` 文件不存在、无权访问或物理文件缺失

后端流程图：

```mermaid
flowchart TD
  A([收到请求]) --> B[requireAuth]
  B --> C{已登录?}
  C -- 否 --> Z([返回 401])
  C -- 是 --> D[getOwnedActiveFile]
  D --> E{文件存在且归属当前用户?}
  E -- 否 --> Y([返回 404])
  E -- 是 --> F{物理文件存在?}
  F -- 否 --> X([返回 404])
  F -- 是 --> G[设置 inline headers]
  G --> H[创建读取流并 pipe 到响应]
  H --> I([发送预览流])
```

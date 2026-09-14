# 文件管理模块 PRD

## 模块概述

完整的文件管理系统，支持大文件分片断点续传、文件夹层级管理、文件预览和分享。

**服务端**: `server/app/routes/file.ts` + `server/app/models/file/`
**客户端**: `client/src/views/file-manage/` + `client/src/component/upload/`

---

## 数据模型

### File
```
{
  name:        string          // 文件名
  extension:   string          // 扩展名
  mimeType:    string          // MIME 类型
  size:        number          // 文件大小（字节）
  hash:        string          // 文件 SHA 哈希（用于断点续传识别）
  folderId:    ObjectId | null // 所属文件夹
  ownerId:     string          // 上传者 ID
  storagePath: string          // 存储路径
  status:      'active' | 'recycled' | 'processing'
  createdAt:   Date
  updatedAt:   Date
}
```

### Folder
```
{
  name:      string
  parentId:  ObjectId | null   // 父文件夹
  path:      string            // 完整路径
  ownerId:   string
  createdAt: Date
  updatedAt: Date
}
```

### UploadTask（分片上传任务）
```
{
  fileHash:       string        // 文件哈希
  ownerId:        string
  fileName:       string
  totalSize:      number
  folderId:       ObjectId | null
  totalChunks:    number
  uploadedChunks: number[]      // 已上传分片序号
  tempDir:        string        // 临时目录
  createdAt:      Date          // TTL: 24 小时
}
```

---

## API 端点

### 上传
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/file/init` | 初始化上传任务。返回 `uploadId` 和需要补传的分片 |
| POST | `/file/uploadchunk` | 上传分片。FormData: `{ uploadId, chunkIndex, chunk }` |
| POST | `/file/merge` | 合并分片为完整文件 |

### 文件夹
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/file/createfolder` | 创建文件夹。body: `{ name, parentId? }` |
| GET | `/file/folders` | 获取所有文件夹 |
| POST | `/file/list` | 获取目录内容（文件+子文件夹）。body: `{ folderId? }` |

### 操作
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/file/rename` | 重命名。body: `{ id, name, type: 'file'|'folder' }` |
| POST | `/file/move` | 移动。body: `{ id, targetFolderId, type }` |
| POST | `/file/delete` | 删除（到回收站）。body: `{ id, type }` |
| POST | `/file/delete-batch` | 批量删除 |

### 预览和下载
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/file/preview-url/:fileId` | 获取签名预览 URL（COS/存储） |
| GET | `/file/stream/:fileId` | 流式预览（带签名） |
| GET | `/file/preview/:fileId` | 直接预览 |
| GET | `/file/download/:fileId` | 直接下载 |
| GET | `/file/public-download/:fileId` | 公开分享下载 |
| GET | `/file/share-url/:fileId` | 生成分享链接 |

---

## 客户端页面

### 文件管理 `/file/*`
- `client/src/views/file-manage/index.tsx` — 主页面
- `client/src/views/file-manage/components/FileListTable/` — 文件列表表格
- `client/src/views/file-manage/components/FilePreviewModal.tsx` — 文件预览弹窗
- `client/src/views/file-manage/components/FolderBreadcrumbs.tsx` — 文件夹面包屑

---

## 可复用组件

| 组件 | 路径 | 用途 |
|------|------|------|
| UploadListWrapper | `component/upload/UploadListWrapper` | 上传任务列表 UI |
| UploadItem | `component/upload/UploadItem` | 单个上传项（进度条） |
| GlobalUpload | `component/upload/hooks/GlobalUpload.ts` | 全局上传管理 hook |
| ImgToGitupload | `component/upload/ImgToGitupload` | 图片上传到 GitHub 图床 |
| MarkdownUpload | `component/upload/MarkdownUpload` | Markdown 文件导入 |

---

## 状态管理

| Atom | 路径 | 用途 |
|------|------|------|
| 上传队列 | `store/atom/FileAtom.ts` | 上传任务状态、文件夹列表、面包屑路径 |

---

## 如何开发新功能

### 支持新的存储后端
1. 修改 `server/app/routes/file.ts` 的存储逻辑
2. 更新 `preview-url` 和 `stream` 端点的 URL 签名逻辑
3. 确保分片上传机制兼容新后端

### 添加文件转换/处理
1. 在文件上传完成后的 merge 阶段添加处理步骤
2. 利用 `status: 'processing'` 状态标识处理中
3. 前端通过轮询或 WebSocket 获取处理进度

---

## 依赖关系

- 依赖 **auth** 模块（认证）
- 使用 Multer 中间件处理文件上传
- 使用 fs-extra 进行文件系统操作

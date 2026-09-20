# 文件管理模块 PRD

## 模块概述

完整的文件管理系统，支持大文件分片断点续传、文件夹层级管理、文件预览和分享。

**服务端**: `server/app/routes/file/` + `server/app/controller/file/` + `server/app/services/fileManagement/` + `server/app/services/fileAccess/`
**客户端**: `client/src/views/file-manage/` + `client/src/features/file/` + `client/src/component/upload/`

---

## 数据模型

### File
```
{
  name:        string          // 文件名
  extension:   string          // 扩展名
  mimeType:    string          // MIME 类型
  size:        number          // 文件大小（字节）
  hash:        string          // 完整/抽样 MD5；与 size 共同识别文件
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
  chunkSize:      number
  uploadedChunks: number[]      // 已上传分片序号
  tempDir:        string        // 临时目录
  storagePath?:   string        // 内部最终路径，供崩溃恢复与清理
  mergeToken?:    string        // 合并租约 fencing token
  mergeLeaseExpiresAt?: Date    // 合并租约到期时间
  cleanupToken?:  string        // 过期清理 claim，仅内部使用
  status:         'uploading' | 'merging' | 'completed' | 'failed'
  expiresAt:      Date          // 默认 24 小时，由维护任务显式清理
}
```

---

## API 端点

### 上传
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/file/init` | 使用 `ownerId + hash + size` 在用户内秒传，或返回续传任务 |
| POST | `/file/uploadchunk` | 上传分片。FormData: `{ uploadId, chunkIndex, chunk }` |
| POST | `/file/merge` | 校验全部分片并原子合并为完整文件 |
| GET | `/file/upload/:uploadId` | 查询上传任务及已完成分片 |
| DELETE | `/file/upload/:uploadId` | 取消任务并清理临时文件 |

### 上传约定

- 秒传只在同一用户内生效，必须同时匹配 hash 与数值型文件大小；跨用户不共享上传记录或物理文件。
- 小于 100MB 的文件计算完整 MD5，大文件计算包含文件大小的抽样 MD5；服务端仍独立比较 `size`。
- 小文件校验阶段占进度 0–10%，大文件抽样校验与初始化保持 0%；分片阶段分别从 10% / 0% 推进至 99%，合并完成才显示 100%。新上传、断点续传与刷新恢复使用相同计算口径。
- 分片大小按文件大小选择 5MB、10MB 或 20MB；服务端校验分片数量、索引和实际字节数。
- 客户端最多保留 5 个未完成任务，全局最多并发 6 个分片、单文件最多并发 3 个分片。
- 默认限制为单文件 10GB、单用户 100GB，可通过服务端环境变量覆盖。
- 合并先写入 `.part` 文件，完整校验通过后再原子重命名；完成接口可以安全重试。
- 秒传与最终合并落库会在 owner 级目录结构锁内重新校验目标目录，避免上传期间目录被删除后产生不可见的孤儿文件。
- 合并使用可续期租约和 fencing token；进程中断后，过期租约可被安全接管，旧 worker 不能覆盖新任务状态或删除新 worker 的暂存文件。
- 每个合并租约使用独立 `.part` 路径。取消、账户删除和过期维护会先按引用计数清理最终文件，并清理该任务的全部暂存文件后再删除任务记录。
- `UploadTask.expiresAt` 使用普通扫描索引，不使用 Mongo TTL 自动删除；后台维护按小时显式回收，清理失败时保留任务以便重试。
- 上传初始化、合并和任务状态接口只返回公开文件 DTO，不返回 `storagePath`、`hash`、`ownerId` 或上传内部字段；任务关联文件会再次带 `ownerId` 查询。

### 文件夹
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/file/createfolder` | 创建文件夹。body: `{ name, parentId? }` |
| GET | `/file/folders` | 获取所有文件夹 |
| GET | `/file/list` | 规范化目录列表；支持分页、当前目录搜索、类型筛选和排序 |
| POST | `/file/list` | 旧版全量目录列表，保留一个兼容周期 |

`GET /file/list` 使用 `limit/offset` 分页：`limit` 默认 20、范围 1–50，`offset` 默认 0。可选参数为 `parentId`、`query`、`category`（`all/folder/document/image/video/audio/archive/other`）、`sortBy`（`name/updatedAt`）和 `sortOrder`（`asc/desc`）。响应 `data` 为 `{ items, total, count, limit, offset, hasMore, nextOffset, breadcrumbs }`；`items` 是带 `kind` 的文件/文件夹联合类型，文件夹始终排在文件之前，并以 `_id` 作为稳定排序兜底。列表 DTO 不返回 `storagePath`、`hash` 或 `ownerId`，`breadcrumbs` 由服务端按 owner 校验后生成完整祖先链。

### 操作
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/file/rename` | 重命名。body: `{ _id, name, kind: 'file'|'folder' }` |
| POST | `/file/move` | 移动。body: `{ _id, kind, targetFolderId }`；`null` 表示根目录 |
| POST | `/file/move-batch` | 批量移动。body: `{ targets: [{ id, kind }], targetFolderId }`；返回 `moved/skipped/failed` 明细 |
| POST | `/file/delete` | 永久删除。body: `{ fileId, kind }` |
| POST | `/file/delete-batch` | 批量永久删除。body: `{ targets: [{ id, kind }] }`；兼容旧 `fileIds` |

目录创建、目录移动和包含文件夹的删除共用 owner 级 Mongo 租约锁，防止并发操作形成循环、孤儿目录或按旧层级快照误删；批量移动采用部分成功策略。
永久删除和账户清理会在删除数据库引用前写入持久化物理清理队列；磁盘删除失败不会回滚已经完成的逻辑删除，后台任务会按 owner 锁定后重试，确认仍有其他文件引用时则安全移除队列项。

### 用量与配额
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/file/stats` | 当前用户存储用量（已用、上传中预留、配额、文件/文件夹数） |

`GET /file/stats` 返回 `{ usedBytes, reservedBytes, quotaBytes, fileCount, folderCount }`。`usedBytes` 为活跃文件大小合计，`reservedBytes` 为未完成上传任务预留的大小，二者与上传配额校验共用同一统计口径；`quotaBytes` 来自服务端环境变量。

上传初始化成功、取消成功、上传完成和删除完成后刷新用量缓存；暂停仍保留服务端预留，不提前扣减展示值。

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
- `client/src/views/file-manage/index.tsx` — 页面编排
- `client/src/features/file/hooks/` — 查询、分页和文件操作控制器
- `client/src/features/file/components/` — 工具栏、路径、文件列表、批量操作和移动面板
- `client/src/views/file-manage/components/FilePreviewModal.tsx` — 文件预览弹窗

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
| 上传队列 | `store/atom/FileAtom.ts` | 上传任务状态 |

文件列表由 TanStack Query 按目录、分页、搜索、分类和排序条件缓存。目录切换、查询条件或页码变化会清空当前页选择；上传和写操作完成后精确刷新受影响目录。

上传任务元数据持久化到浏览器本地存储。刷新后客户端查询服务端任务状态，用户重新选择名称和大小一致的原文件后继续上传；浏览器不持久化文件 Blob。

---

## 如何开发新功能

### 支持新的存储后端
1. 修改 `server/app/services/fileUpload/` 的上传与落库逻辑
2. 更新 `server/app/services/fileAccess/` 的签名与流式响应逻辑
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

## 移动端行为

- 文件列表在窄屏仅展示选择、名称和行级操作；点击文件或文件夹打开，复选框用于批量选择。
- 文件夹面包屑允许横向滚动，顶部操作按可用宽度换行。
- 上传队列在移动端以底部面板展示，移动和预览对话框不得超出视口。
- 键盘操作、右键菜单和拖拽仅面向桌面端；移动端排序使用工具栏下拉，不使用列头排序。

---

## 交互基线（2026-09-11）

- 文件名与扩展名分开渲染：主名尾部省略，扩展名始终可见；搜索命中的片段高亮。
- 时间列悬停显示完整时间戳；文件大小与时间使用等宽数字对齐。
- 桌面端点击列头切换排序（文件名、最近修改）；移动端保留工具栏排序下拉。
- 空目录显示“上传文件 / 新建文件夹”入口；搜索或筛选无结果时显示“清除筛选”。
- 面包屑超过 4 级时把中间层级折叠进下拉菜单，并保留根目录与最近两级。
- 桌面端支持键盘操作：↑↓/Home/End 移动焦点，Shift+↑↓ 连续选择，Enter 打开，空格切换选择，Delete 删除，Ctrl/Cmd+A 全选，Esc 清空选择；焦点在输入框内时不触发。
- 行内操作按钮、菜单和输入控件独立处理键盘事件，列表不拦截其 Enter / 空格；文件名与行焦点继续支持列表快捷键，输入法组合期间不触发。
- 桌面端支持 Shift 连续选择与 Ctrl/Cmd 点选；右键列表行打开与行级菜单相同的上下文菜单，右键未选中行时先选中该行。
- 支持拖拽移动：拖拽已选行到文件夹行或面包屑完成移动，多选整体拖拽，禁止拖到自身；拖拽过程高亮有效目标。
- 支持拖拽上传：文件或整个文件夹拖入列表上传到当前目录，拖到文件夹行或面包屑上传到对应目录；拖拽过程显示上传目标提示。
- 普通文件和已有文件夹仍不提供重命名入口，只保留新建文件夹后的即时命名流程。
- 文件预览支持 ←/→ 在同目录可预览文件间切换，标题显示当前位置；焦点在播放器或输入控件内时不触发。
- 文件页标题下方显示存储用量（已用 / 配额，含上传中预留）；删除和上传完成后自动刷新。
- 排序方式与类型筛选在浏览器本地持久化，重新进入文件页沿用上次选择。

---

## 界面设计基线（2026-07-20）

- [已确认的 File Library HTML 设计稿](./design-options/07-macos-finder/index.html)
- 页面复用 Note Library 的中性灰白主题、40px 标题、44px 桌面列表行、低对比边界和渐进式操作；不渲染文件或文件夹类型图标。
- 外层继续使用 Nubbi Client 的 SideBar、共享 Header 和移动底部导航，文件页面不再增加 Finder 窗口或内部侧栏。
- 当前目录搜索、类型筛选和排序由服务端在分页前执行，结果始终保持文件夹优先；UI 固定每页 20 项。
- 桌面单击行选择、双击或显式按钮打开；移动端单击打开，复选框负责选择。新建文件夹成功后立即进入行内重命名。
- 普通文件和已有文件夹的行级菜单不提供重命名按钮；保留新建文件夹后的即时命名流程。

> HTML 文件仅作为视觉基线，真实页面使用 React、Tailwind、Ant Design 基础控件和现有文件 API 实现。

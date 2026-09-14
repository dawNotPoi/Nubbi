# 文件上传模块 Bug 记录

> 发现时间：2026-06-14  
> 涉及模块：`client/src/utils/file.ts` · `client/src/utils/worker.ts` · `client/src/component/upload/`

---

## P0 — 严重 Bug

### BUG-001 恢复失败上传后实际不会上传任何内容

**位置**：`client/src/utils/file.ts` `start()` / `resume()`

**现象**：chunk 重试 3 次耗尽后状态置为 `ChunkStatus.fail`，用户点击"恢复"后进度条不动，上传静默挂死。

**根因**：`resume()` 调用 `start()`，`start()` 只捡 `ChunkStatus.pending` 的 chunk。失败的 chunk 从未被重置，永远不会再被调度。

**修复方向**：`resume()` 时将所有 `ChunkStatus.fail` 的 chunk 重置为 `pending`，retries 清零。

---

## P1 — 高优先级

### BUG-002 刷新页面后进行中的上传任务全部丢失

**位置**：`client/src/store/atom/FileAtom.ts`

**现象**：刷新页面后上传列表清空，无法恢复。服务端已有 `uploadId` 和 `uploadedChunks` 断点记录，但客户端未持久化 `uploadId`，丢失后只能从头重传。

**修复方向**：将 `uploadId` 持久化到 `sessionStorage`，页面加载时检测未完成任务并提示恢复。

---

### BUG-003 上传文件始终落到根目录，忽略当前所在文件夹

**位置**：`client/src/utils/file.ts` `upload()` / `client/src/component/upload/hooks/GlobalUpload.ts`

**现象**：无论用户处于哪个子文件夹，上传的文件都出现在根目录。

**根因**：`initUploadTask` 接受可选 `folderId`，但 `Uploader` 构造函数和 `GlobalUpload.createUploadTask` 均未传入。

**修复方向**：`createUploadTask(file, folderId?)` 增加 `folderId` 参数，透传至 `initUploadTask`。

---

### BUG-004 多文件并发上传时连接数失控

**位置**：`client/src/utils/file.ts`

**现象**：每个 `Uploader` 独立维护 6 条并发，3 个文件同时上传产生 18 个并发请求，后发的 chunk 请求容易超时并触发不必要的重试。

**修复方向**：引入全局并发池，所有文件共用总并发上限（建议 6~8）。

---

### BUG-005 上传进行中关闭标签页无任何拦截

**位置**：`client/src/component/upload/hooks/GlobalUpload.ts`

**现象**：用户误关标签页直接中断上传，结合 BUG-002 无法恢复。

**修复方向**：有活跃上传任务时注册 `beforeunload` 监听，弹出浏览器原生确认框。

---

## P2 — 中优先级

### BUG-006 所有上传错误仅显示"失败"，无任何原因说明

**位置**：`client/src/component/upload/UploadItem.tsx`

**现象**：网络断开、服务端 4xx/5xx、文件被拒绝，用户看到的都是同一个红色"失败"，无法判断如何处理。

**修复方向**：在 `Uploader.fail()` 中记录错误信息，`UploadItem` 展示简短原因文案（如"网络超时，点击重试" / "文件类型不支持"）。

---

### BUG-007 大文件抽样 hash 时进度条 0%→10% 瞬间跳变

**位置**：`client/src/utils/file.ts` `HASH_PERCENTAGE`

**现象**：≥100MB 文件使用抽样 hash，仅读约 14MB，速度极快，hash 阶段占用的 10% 进度在不到一秒内跳过，随后进度卡住等待服务端响应，体验割裂。

**修复方向**：对大文件将 `HASH_PERCENTAGE` 设为 0 或 2，或在 hash 完成后直接跳过这一阶段的进度展示。

---

### BUG-008 没有取消单个上传任务的入口

**位置**：`client/src/component/upload/UploadItem.tsx`

**现象**：只有暂停/恢复，无法取消。失败任务永远留在列表，只能刷新页面清除。

**修复方向**：增加"取消"按钮，调用 `Uploader` 新增的 `cancel()` 方法，从 atom 中移除该任务。

---

### BUG-009 上传列表关闭后无活跃上传指示

**位置**：`client/src/component/upload/UploadListWrapper.tsx`

**现象**：Modal 关闭后后台仍在上传，但页面上没有任何 badge 或角标，用户不知道是否还在传。

**修复方向**：在上传入口按钮或导航栏上叠加活跃任务数 badge，上传完成时弹出 toast 通知。

---

## P3 — 低优先级

### BUG-010 `uploadTaskAtomFamily` 永不清理，长会话内存持续增长

**位置**：`client/src/store/atom/FileAtom.ts`

**修复方向**：任务完成/取消后调用 `uploadTaskAtomFamily.remove(taskId)` 释放 atom。

---

### BUG-011 无客户端文件大小上限校验

**位置**：`client/src/component/upload/hooks/GlobalUpload.ts`

**现象**：用户可以选择任意大小的文件，要等服务端拒绝才知道文件过大，体验差。

**修复方向**：在 `createUploadTask` 入口处校验文件大小，超限时立即提示并阻止创建任务。

---

### BUG-012 上传列表无"清除已完成"按钮

**位置**：`client/src/component/upload/UploadListWrapper.tsx`

**修复方向**：列表顶部增加"清除已完成"按钮，过滤移除所有 `status === success` 的任务。

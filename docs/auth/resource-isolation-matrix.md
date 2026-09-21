# 资源归属隔离矩阵

审计日期：2026-09-21。范围为主服务已挂载的 note、tag、summary、file、image、meeting、MCP，以及公开 Blog 和文件签名链接。依据当前工作区 route → controller/service → query 的静态证据；本表本身不代表双账号 HTTP、真实数据库或生产验收已通过。

## 共同边界

- `server/app/index.ts` 挂载下列根路径，不附加 `/api` 前缀。
- 普通业务身份来自 `middleware/session.ts` → `services/auth/credential-resolver.ts` → `lib/authUser.ts`。`x-api-key` 优先；JWT 取经过验证的 `sub` 并检查用户存在；其余请求交由 Better Auth Session 解析。actor 不取自 body/query 的用户标识。
- 下表的 **普通凭证** 指 Session、JWT 或无 permissions 的通用 API Key。Note 还允许明确拥有对应 `note` action 的非 MCP scoped Key；其余采用 `requireAuthWithApiKey` 的模块会拒绝 scoped Key。MCP metadata 或权限指纹命中的 Key 不能走普通 Note 路由。
- 无凭证或明确无效凭证返回 401，带 `X-Auth-Rejected: before-handler`。权限不足返回 403；认证后端不可用按统一错误映射返回服务错误，不当成资源不存在。
- **账号写锁** 指 `middleware/account-mutation.ts` 在认证后的非 GET/HEAD/OPTIONS 请求登记注销互斥，`middleware/common.ts` 在 handler 完成/错误后释放。该锁允许同账号多个正常写请求并行，只保证本进程内注销与在途写操作协调，不能称为所有业务写入串行锁。
- 外来资源与不存在资源保持同一路径的缺失契约；既有接口可能返回 404、200/null 或批量 missing/failed，不能仅凭 HTTP 200 判定越权。

## 私有资源

| 路由 | 凭证与 actor | Controller / Service → 查询证据 | 外来 / 缺失资源契约 | 写入保护 |
| --- | --- | --- | --- | --- |
| `GET /note/all, /roots, /recent, /getNote, /trash`；`POST /note/search` | 普通凭证；`actor.id` | `routes/note/index.ts` → `controller/note/list-query.ts`、`search-query.ts`：列表、计数、搜索和路径祖先查询均有 `userId`；活跃列表有 `deletedAt:null`，回收站相反 | 列表只含本人项；无匹配返回空列表 | search 是 POST，进入账号写锁；其余只读 |
| `GET /note/detail, /children, /ancestors` | 同上 | `list-query.getNoteById`：`{_id,userId,deletedAt:null}`；children 先 `access.assertOwnedNote` 再按 `parentId,userId` 查询；ancestors 每一级带 `userId` | detail：200/null；children：404；ancestors：200/空数组 | 只读 |
| `POST /note/create` | 同上；输入不提供有效的 owner 覆盖入口 | `user-commands.createUserNote` 最后写入 actor 的 `userId` → `create.ts` 校验父节点 `{_id,parentId对应值,userId,deletedAt:null}`，创建和父节点更新均同 owner | 外来父节点 404；自定 `_id` 遇已有记录只会唯一键冲突，不会覆盖 | 账号写锁 |
| `PUT /note/content, /properties, /publish` | 同上 | `update.ts`：正文初读、CAS 更新、冲突回读、属性和发布更新均有 `userId`；移动经 `hierarchy-query.validateNoteMoveTarget`、`structure-update.moveNote`，新旧父节点同 owner | 外来目标 404；普通 properties 移到外来父节点会先返回 400（移动目标校验）；正文 revision 冲突只回本人记录 | 账号写锁；正文可选 revision CAS；移动可选 Mongo 事务 |
| `DELETE /note/delete, /purge`；`PUT /note/restore` | 同上 | `delete.ts`：根节点、后代遍历、批量更新均有 `userId`；purge 任务按 `{userId,rootNoteId}`；`services/note/purge.ts` 删除 Note 带 `userId`，Summary 按已归属确认的目标 noteIds 删除 | 外来根 404；恢复/永久删除非回收站项 400；待 purge 项恢复 409 | 账号写锁；持久化 purge 任务。当前函数入口未调用独立 Note 结构租约锁，不把历史 PRD 的锁描述当作现有证据 |
| `GET /tag/list`；`POST /tag/create`；`DELETE /tag/delete` | 普通凭证；`actor.id` | `controller/tag.ts`：Tag 查询/upsert/delete 使用 `{userId,name}`；历史 Note 标签回退和删标签的 Note updateMany 也带 `userId` | 同名标签互不影响；删除不存在标签幂等成功，路由返回 null | 写接口有账号写锁 |
| `POST /summary/find, /create` | Note 权限；`actor.id` | `controller/summary.ts` 先 `assertOwnedNote(userId,noteId)`，底层 `access.ts` 带 `_id,userId,deletedAt:null`；通过后才按 `noteId` 查询/upsert Summary | 外来/已删除笔记 404；本人笔记无摘要时 find 返回 200/null | 两条 POST 都有账号写锁；Summary 通过所属 Note 授权，不需要为同一事实增设第二 owner 字段 |
| `GET /image/get`；`DELETE /image/delete`；`POST /image/create, /github` | 普通凭证；`actor.id` | `controller/image.ts`：find/delete 均 `{_id,ownerId}`；create 的 owner 在 route 由 actor 覆盖；schema 不开放 remotePath/remoteSha；GitHub 上传完成后绑定 owner | 外来 get/delete 均 200/null，且不会排入远端清理；伪造 owner 字段被严格 schema 拒绝 | create/delete 有账号写锁；multipart github 跳过请求早期登记，controller 用 `runAccountMutation` 包围实际上传和落库 |
| `GET /file/list, /folders, /stats`；兼容 `POST /file/list` | 普通凭证；`actor.id` | `controller/file/management.ts`、`compatibility.ts` → `services/fileManagement/list.ts, legacy.ts, stats.ts`：File/Folder 列表与计数带 `ownerId`，面包屑逐层 `{_id,ownerId}`；用量经 owner 汇总 | 外来 parentId 404；无数据空列表/零计数 | GET 只读；兼容 POST 有账号写锁 |
| `POST /file/createfolder, /rename, /move, /move-batch` | 同上 | `legacy.ts` 创建前验证父目录，rename 使用 `{_id,ownerId}`；`move.ts` 只加载本人目录图，来源文件与目标目录均校验 owner，最终 update 仍带 owner | 单项缺失 404；批量外来源记入 failed；外来目标目录整请求 404 | 账号写锁；目录创建/移动有 owner 级 Mongo 租约锁 |
| `POST /file/delete, /delete-batch` | 同上 | `fileManagement/delete.ts`：源文件、目录图、嵌套文件、最终 deleteMany 均带 owner；清理队列根据这些已确认记录生成 | 全部外来目标 404；混合批量只删本人项并回 `missingFileIds/missingFolderIds` | 账号写锁 + owner 目录租约锁 + 持久化物理清理队列 |
| `POST /file/init` | 同上 | `fileUpload/initTask.ts`：任务查找为 `ownerId+fileHash+totalSize`；`filters.ts` 秒传为 `ownerId+hash+size+active`；`folderValidation.ts` 校验目标 owner；创建记录使用 actor owner | 外来 folderId 403；相同 hash 不会跨 owner 秒传或接管续传 | 账号写锁 + owner 目录租约锁；秒传落库再校验目录 |
| `POST /file/uploadchunk, /merge`；`GET/DELETE /file/upload/:uploadId` | 同上 | `controller/file/upload.ts` → `chunkTask.ts, mergeClaim.ts, taskLifecycle.ts`：任务读取/认领/更新带 `_id,ownerId`；关联 fileId 回读再验 owner；`finalizeTask.ts` 校验 owner、merge token、有效租约后落库 | 外来分片/merge/status 404；cancel 为 200 `{cancelled:false}` | 除 GET 均有账号写锁；multipart chunk 在 controller 用 `runAccountMutation`；owner 目录租约和合并 fencing token |
| `GET /file/download/:fileId, /preview/:fileId, /preview-url/:fileId, /share-url/:fileId` | 同上；下载兼容 controller 读取已认证 `req.user.id` | `controller/fileLinks.ts, fileDelivery.ts` → `fileAccess/resource.getOwnedActiveFile`：`{_id,ownerId,status:'active'}`；签发链接前还验证物理资源存在 | 外来/缺失记录 404，不生成签名链接 | 只读/签发能力链接，无数据库写入 |

## 会议、MCP 与公开例外

| 路由 | 凭证与 actor | Controller / Service → 查询证据 | 授权与拒绝契约 | 写入保护 / 例外 |
| --- | --- | --- | --- | --- |
| `POST /meeting/create`；`GET /meeting/findMyMeeting` | 普通凭证；`actor.id` | `controller/meeting/commands.ts` 创建时最后设置 `hostId:actor.id`；`queries.findMyMeetings` 用 `{hostId:actor.id}` | 我的列表只含本人主持项；密码哈希不进入 DTO | create 有账号写锁；读取可能执行过期自动结束 |
| `POST /meeting/vetMeeting`；`DELETE /meeting/delete`；`GET /meeting/comments` | 同上 | commands 的 exists 与最终 update/delete 均 `{_id,hostId:actor.id}`；comments 先校验该条件后才查 `meetingComment.roomId` | 非主持人/不存在 404；不会执行关闭广播或删除评论 | 写接口有账号写锁；拒绝/删除先执行会议关闭栅栏，等待在途评论 |
| `GET /meeting/list`；`POST /meeting/findByPage` | 普通凭证；无 owner 限定 | `queries.ts` → `services/meeting/list.ts` 有意查询全站会议信息；旧筛选只接收 schema 白名单标量 | 允许看其他主持人的会议发现信息；DTO 去除 password/passwordHash，只留 hasPassword | 现有 PRD 明确的会议发现功能；不是 owner 漏滤。旧 POST 有账号写锁；自动结束是按时间的内部生命周期更新 |
| `GET /meeting/findAllMeeting, /findById` | 无需凭证 | `queries.findAllMeetings/findMeetingById` → `meeting.find()/findById()` → `list-dto.serializeMeetingListItem` | 公共发现/详情；不存在详情为 200/null；无密码明文/哈希 | 明确公开例外；可能触发过期自动结束，不授予修改会议/读历史评论权限 |
| `POST /meeting/validateAccess`；Socket 入会/评论/结束 | HTTP 普通凭证；Socket 已认证 actor | `commands.validateMeetingAccess` 校验状态/时效/密码，签发 `meetingId+userId` token；`realtime.authorizeMeetingJoin` 比较 token 两个绑定值；结束用 `{_id,hostId}`；评论 identity 来自 actor | 登录用户可凭会议密码加入其他主持人的会议；错误密码回 `passed:false`，限流 429；冒用他人 token 返回 INVALID_ACCESS | HTTP POST 账号写锁；Socket 评论有账号写锁+会议栅栏；主持人职责与参与者职责保留 |
| `GET /mcp-api/context, /tags, /notes, /notes/search, /notes/:noteId, /trash`；`POST /mcp-api/notes/batch` | 仅符合 kind/version/scope 的 MCP API Key；owner 来自验证后的 Key | `routes/mcp/read.ts` → `controller/mcp/noteRead.ts`：所有列表/计数/详情/批量查询均带 `userId`；路径和回收站恢复判断沿本人树查询；tags 复用本人 tag 查询 | 外来详情 404；批量外来 ID 在 missingIds；本人 user/agent 来源均可读；普通 Session 不可使用 MCP 入口 | batch 虽只读但 POST 会进入账号写锁 |
| `POST /mcp-api/notes` | 同上 | `noteCreate.ts` 检查父节点 owner；服务端固定 `userId`、`source:'agent'`、初始 inbox；创建父节点可为本人普通笔记 | 外来父节点 404；不接收发布、owner 或 purge 能力 | 账号写锁 |
| `PATCH /mcp-api/notes/:noteId/content, /properties`；`POST .../move, /archive, /trash, /restore` | 同上；每路由核对对应 note action | `access.assertAgentNote/assertPureAgentSubtree` 先核对 owner，再核对来源；`noteContent.ts, noteProperties.ts, noteLifecycle.ts` 最终更新带 `userId` 与 `source:'agent'`；父节点、后代、冲突回读仍限 owner | 外来对象 404；本人 user 来源写入 403；含 user 后代的整树操作 409；revision/时间戳冲突 409；无发布/purge 路由 | 账号写锁 + 内容 revision/属性时间戳条件更新；当前未见独立 Note 结构租约入口 |
| `GET /blog/posts, /posts/:id, /tags` | 无需凭证；无私有 actor | `routes/blog/index.ts` → `controller/blog/queries.publicFilter` 固定 `published:true,deletedAt:null,password in [null,'']`，可选 BLOG_AUTHOR_ID；列表/详情/标签共用边界，presentation 白名单输出 | 不可公开详情 404；草稿/密码笔记/回收站不会出现在列表或标签中 | 明确公开发布例外；no-store；不需要登录用户 owner |
| `GET/HEAD /file/stream/:fileId`；`GET /file/public-download/:fileId` | 无需 Session；签名 URL 是访问凭证 | `fileAccess/signatures.ts` 用 HMAC 绑定 fileId、uid、expires；分享签名包含独立用途前缀；`fileDelivery.ts` 验签后用签名 uid 取 owned active file | 无签名、篡改任一绑定值、过期或混用预览/下载签名均 403；记录/文件不存在 404；持有效 URL 的其他用户/匿名请求被允许 | 明确分享例外。预览签名有效 1 小时，分享下载 7 天；预览内存缓存命中时不再查数据库，因此不声称链接每次读取都会复核逻辑删除/账号状态 |

## 结论与验收边界

本次静态审计未确认可由账号 B 通过上述私有接口读写账号 A 资源的具体路径，因此不为隔离审计改写已有正确查询，不增设角色或重复 owner 字段。摘要与评论通过父资源授权、批量操作返回 missing/failed、公开会议发现、公开博客和签名分享均属于现有契约。

写锁列按源码记录实际机制。历史文档中“Note 结构变更共享 Mongo 租约锁”的描述与当前入口不一致；这不等同于已证明的跨账号越权，本任务不扩大为并发结构设计整改。签名预览缓存的撤销时效也单列为已知行为，不把持有有效分享能力本身认定为越权。

双账号 HTTP 验证已使用独立临时数据库与虚构 A/B，完成笔记、摘要、目录、会议、图片、上传和文件访问的跨账号校验，以及签名分享正反向验证。实际执行范围与限制见 [本地验收记录](./auth-refactor-verification.md)；本表是完整静态入口矩阵，不代表每个入口的全部分支均已运行覆盖。

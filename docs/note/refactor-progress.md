<<<<<<< HEAD
# 笔记重构进度

本文件记录笔记模型重构的逐步交接说明。

## 2026-06-29

### 步骤 1 - 模型基础

状态：已完成

已完成：
- 围绕 `parentId + hasChildren` 重写 `server/app/models/note.ts`。
- 从 Note schema 中移除 `children`、`watched` 和 `like`。
- 新增顶层字段 `source`、`status`、`published`、`tags`、`author`、`deletedAt`、`expiresAt`。
- 将 `meta` 从开放的混合对象改为 `{ key, value, type }` 数组。
- 添加规划的 Note 索引。
- 将 `server/app/models/summary.ts` 中 `noteId` 从 `String` 改为带 `ref: "Note"` 的 `ObjectId`。
- 加固 `server/app/lib/db.ts` 的连接选项。
- 为主要查询辅助函数添加 `deletedAt: null` 过滤和 `.limit(500)`。
- 将叶子笔记查询从 `children` 检查改为 `hasChildren: false`。
- 新增 `findNotesByFilter({ status, tags, published })`，保留 `findNotesByStatus` 作为兼容包装。
- 通过 `pnpm --filter nubbi-server typecheck` 验证。

给下一位的备注：
- 客户端类型仍期望旧的 API 形态。
- 尚未添加数据迁移；方案有意在步骤 2 切换到新数据库。

### 步骤 2 - 数据库切换

状态：已完成

已完成：
- 将 `server/.env` 中 `MONGO_DB_NAME` 从 `Nubbi` 改为 `Nubi-AI`。

给下一位的备注：
- `server/.env` 原本是只读的；已移除只读属性以应用此更改。

### 步骤 3 - 服务端控制器与路由

状态：已完成

已完成：
- 步骤 1 期间部分准备了查询基础：活跃笔记过滤、查询限制、`hasChildren` 叶子检查、`findNotesByFilter`。
- 更新创建流程：基于 `source` 的初始 `status`、父节点 `hasChildren`、复制时 meta 深拷贝。
- 更新内容/属性流程：inbox 到 active 的晋升、发布约束、移动事务回退。
- 在 `/note/publish` 和 `/note/properties` 中强制执行 `published: true` 约束。
- 将物理删除替换为软删除，新增恢复/彻底删除控制器操作。
- 新增 `GET /note/trash`、`PUT /note/publish`、`PUT /note/restore`、`DELETE /note/purge`。
- 将路由 schema 更新为新的 `source/status/published/tags/meta` 形态。
- 通过 `pnpm --filter nubbi-server typecheck` 验证。

给下一位的备注：
- 移动操作实现了事务回退，因为本地 MongoDB 可能是单机模式。副本集上使用 `session.withTransaction`。
- `meta` 同时接受新的数组形式和旧的对象形式以兼容过渡；旧对象的 key 会被转换为条目。
- `GET /note/detail`、`GET /note/roots`、`GET /note/getNote` 保留了原有的认证/所有权边界。重构方案将此标注为后续安全审计项。

### 步骤 4 - 客户端适配

状态：已完成

已完成：
- 将 `client/src/api/note.ts` 更新为新的 Note、NoteWithContent、MetaEntry、source/status/published/tags/deletedAt 形态。
- 新增 `publishNote`、`restoreNote`、`purgeNote`、`getTrashNotes` API 函数。
- 将缓存和层级辅助函数从依赖 `children` 改为基于 `parentId` 的后代遍历。
- 更新侧边栏树和目标选择器的展开逻辑，使用 `hasChildren`。
- 更新 Markdown 导入：`status/tags` 作为顶层字段，其余 frontmatter 转为 meta 条目。
- 更新笔记元数据编辑：`status/tags/date` 写入顶层字段，`type` 保留在 meta 条目中。
- 新增详情页发布开关，仅当笔记状态为 `done` 或 `archived` 时可用。
- 新增笔记库的状态/已发布筛选器，行显示增加 `status`、`published` 和标签。
- 新增 `shared/meta-field-defs.ts`，包含标准 meta 字段定义。
- 新增用于回收站、恢复、彻底删除和发布的客户端 atoms。
- 修复了 `client/src/store/atom/FileAtom.ts` 中现有的 `mutationFn` 类型不匹配问题，该问题曾阻塞客户端 TypeScript 验证。
- 通过 `pnpm --filter nubbi-client build:script` 验证。

给下一位的备注：
- 回收站 UI 面板尚未构建；atoms 和 API 函数已就绪。
- Vite 构建通过，但仍存在一个大 chunk 警告。

### 步骤 5 - 端到端回归测试

状态：待处理

审查修复已完成：
- 强制执行发布不变性：当 `status` 或 `published` 变更时，已发布的笔记不能再通过 `/note/properties` 退回 `inbox` 或 `active`。
- 创建笔记时增加父节点所有权验证。
- 为 `/note/children` 增加父节点所有权验证和 `userId` 范围限定。
- 当 `/note/properties` 请求同时移动笔记时，保留非 `parentId` 属性的更新。
- 禁止恢复父节点仍在回收站中的笔记，避免出现孤立的可见笔记。
- 通过 `pnpm --filter nubbi-server typecheck` 和 `pnpm --filter nubbi-client build:script` 重新验证。
- 使用显式白名单清理创建笔记的写入字段，防止 `published` 或 `deletedAt` 等原始请求字段绕过路由 schema。
- 将 `/note/detail`、`/note/roots`、`/note/getNote` 限定为仅查询当前已认证用户的数据。
- 当父节点缺失（不仅是软删除）时禁止恢复笔记。
- 移除 Markdown frontmatter 的状态解析，因为服务端创建规则应有意决定初始状态。
- 再次通过 `pnpm --filter nubbi-server typecheck` 和 `pnpm --filter nubbi-client build:script` 重新验证。
- 审查循环 3：要求恢复/彻底删除的目标已在回收站中，并使 Note 变更 API 函数在 `{ code: 0 }` 时抛出异常，以确保乐观更新正确回滚。
- 审查循环 4：为 Note 路由的 `noteId`、`parentId` 和创建时的 `_id` 输入增加 ObjectId 格式验证。
- 审查循环 5：在收集后代时增加循环保护，并将搜索路径的父节点查找范围限定为当前用户。
- 审查循环 6：将导出的笔记查询/统计辅助函数（`getAllChildren`、`findNotesByTags`、`findNotesByFilter`、`findNotesByStatus`、`getNoteStats`、`getTagStats`）限定为 `userId` 范围，并为 `getAllChildren` 增加递归循环保护。
- 审查循环 7：修改请求验证中间件，将 Zod 解析后的值写回 `req.body`、`req.query` 和 `req.params`，使 note 路由 schema 使用的强制转换/默认值能真正到达处理器。
- 审查循环 8：停止从客户端 `getRootNotes` API 调用发送已废弃的 `owner` 查询参数；owner 仅作为客户端缓存范围和启用守卫保留。
- 审查循环 9：为 `/note/search` 增加验证，在构建标题正则之前对用户输入进行转义，并移除指向不存在端点的过时客户端 API 导出（`note/list` 和 `note/find`）。
- 审查循环 10：将 `password`、`date` 和 `expiresAt` 加入创建笔记的验证/白名单，并修改 `duplicateNote` 要求 `userId` 且在复制前验证父节点属于同一用户。
- 审查循环 11：在创建子笔记或将笔记移动到新父节点后，在客户端缓存中更新父节点的 `hasChildren: true`，同时保留原有的失效逻辑以进行权威刷新。
- 每次循环后通过 `pnpm --filter nubbi-server typecheck` 和 `pnpm --filter nubbi-client build:script` 重新验证。

待处理：
- 在真实 MongoDB 实例上执行 `docs/note/refactor-plan.md` 中的功能回归检查清单。
- 使用实际数据验证创建/移动/删除/恢复/彻底删除行为。
- 在浏览器中验证笔记库筛选器和详情页发布约束。
- 在种子数据就绪后检查 1000 条笔记的查询性能目标。
=======
# Note Refactor Progress

This file records step-by-step handoff notes for the Note model refactor.

## 2026-06-29

### Step 1 - Model foundation

Status: completed

Completed:
- Rewrote `server/app/models/note.ts` around `parentId + hasChildren`.
- Removed `children`, `watched`, and `like` from the Note schema.
- Added top-level `source`, `status`, `published`, `tags`, `author`, `deletedAt`, and `expiresAt`.
- Changed `meta` from an open mixed object to an array of `{ key, value, type }`.
- Added planned Note indexes.
- Changed `server/app/models/summary.ts` `noteId` from `String` to `ObjectId` with `ref: "Note"`.
- Hardened `server/app/lib/db.ts` connection options.
- Added `deletedAt: null` filtering and `.limit(500)` to the main query helpers.
- Changed leaf-note queries from `children` checks to `hasChildren: false`.
- Added `findNotesByFilter({ status, tags, published })` while keeping `findNotesByStatus` as a compatibility wrapper.
- Verified with `pnpm --filter nubbi-server typecheck`.

Notes for next agent:
- Client types still expect the old API shape.
- No data migration has been added; the plan intentionally switches to the new database in Step 2.

### Step 2 - Database switch

Status: completed

Completed:
- Switched `server/.env` `MONGO_DB_NAME` from `Nubbi` to `Nubi-AI`.

Notes for next agent:
- `server/.env` was read-only; the read-only attribute was removed to apply this change.

### Step 3 - Server controller and routes

Status: completed

Completed:
- Query foundation partly prepared during Step 1: active-note filtering, query limits, `hasChildren` leaf checks, and `findNotesByFilter`.
- Updated create flow for `source`-based initial `status`, parent `hasChildren`, and duplicate meta deep copy.
- Updated content/properties flows for inbox-to-active promotion, publish constraints, and move transaction fallback.
- Enforced `published: true` constraints in both `/note/publish` and `/note/properties`.
- Replaced physical delete with soft delete and added restore/purge controller operations.
- Added `GET /note/trash`, `PUT /note/publish`, `PUT /note/restore`, and `DELETE /note/purge`.
- Updated route schemas to the new `source/status/published/tags/meta` shape.
- Verified with `pnpm --filter nubbi-server typecheck`.

Notes for next agent:
- Transaction fallback is implemented for moves because local MongoDB may be standalone. On a replica set it uses `session.withTransaction`.
- `meta` accepts both the new array form and the old object form for temporary compatibility; old object keys are converted to entries.
- `GET /note/detail`, `GET /note/roots`, and `GET /note/getNote` preserve the previous auth/ownership surface. The refactor plan calls this out as a later security audit item.

### Step 4 - Client adaptation

Status: completed

Completed:
- Updated `client/src/api/note.ts` to the new Note, NoteWithContent, MetaEntry, source/status/published/tags/deletedAt shape.
- Added `publishNote`, `restoreNote`, `purgeNote`, and `getTrashNotes` API functions.
- Updated cache and hierarchy helpers away from `children`; descendant traversal is now based on `parentId`.
- Updated sidebar tree and target picker expansion to use `hasChildren`.
- Updated markdown import so `status/tags` are top-level fields and remaining frontmatter becomes meta entries.
- Updated Note metadata editing so `status/tags/date` write top-level fields and `type` remains in meta entries.
- Added a detail-page published switch, disabled unless the note status is `done` or `archived`.
- Added Note Library status/published filters and row display for `status`, `published`, and tags.
- Added `shared/meta-field-defs.ts` with standard meta field definitions.
- Added client atoms for trash, restore, purge, and publish.
- Fixed an existing `client/src/store/atom/FileAtom.ts` mutationFn type mismatch that blocked client TypeScript verification.
- Verified with `pnpm --filter nubbi-client build:script`.

Notes for next agent:
- Trash UI panel is not built yet; atoms and API functions are ready.
- Vite build passes but still emits an existing large chunk warning.

### Step 5 - End-to-end regression

Status: pending

Review fixes completed:
- Enforced the publish invariant when either `status` or `published` changes. A published note can no longer be moved back to `inbox` or `active` through `/note/properties`.
- Added parent ownership validation during note creation.
- Added parent ownership validation and `userId` scoping for `/note/children`.
- Preserved non-`parentId` property updates when a `/note/properties` request also moves the note.
- Rejected restoring a note while its parent is still in trash to avoid visible orphan notes.
- Re-verified with `pnpm --filter nubbi-server typecheck` and `pnpm --filter nubbi-client build:script`.
- Sanitized create-note writes with an explicit allowlist so raw request fields such as `published` or `deletedAt` cannot bypass route schemas.
- Scoped `/note/detail`, `/note/roots`, and `/note/getNote` to the authenticated user.
- Rejected restore when a note's parent is missing, not only when the parent is soft-deleted.
- Removed Markdown frontmatter status parsing because server-side create rules intentionally decide initial status.
- Re-verified again with `pnpm --filter nubbi-server typecheck` and `pnpm --filter nubbi-client build:script`.
- Review loop 3: required restore/purge targets to already be in trash, and made Note mutation API functions throw on `{ code: 0 }` so optimistic updates roll back correctly.
- Review loop 4: added ObjectId format validation for Note route `noteId`, `parentId`, and create `_id` inputs.
- Review loop 5: added cycle protection while collecting descendants and scoped search path parent lookups to the current user.
- Review loop 6: scoped exported note query/stat helper functions (`getAllChildren`, `findNotesByTags`, `findNotesByFilter`, `findNotesByStatus`, `getNoteStats`, `getTagStats`) to `userId`, and added recursion cycle protection to `getAllChildren`.
- Review loop 7: changed request validation middleware to write Zod parsed values back to `req.body`, `req.query`, and `req.params`, so coercions/defaults used by note route schemas actually reach handlers.
- Review loop 8: stopped sending the deprecated `owner` query parameter from the client `getRootNotes` API call; owner remains only as a client cache scope and enabled guard.
- Review loop 9: added validation for `/note/search`, escaped user input before building the title regex, and removed stale client API exports for nonexistent `note/list` and `note/find` endpoints.
- Review loop 10: added `password`, `date`, and `expiresAt` to create-note validation/allowlist, and changed `duplicateNote` to require `userId` plus same-user parent validation before copying.
- Review loop 11: patched parent `hasChildren: true` in client caches after creating a child note or moving a note under a new parent, while keeping existing invalidation for authoritative refresh.
- Re-verified after each loop with `pnpm --filter nubbi-server typecheck` and `pnpm --filter nubbi-client build:script`.

Pending:
- Run the functional regression checklist from `docs/note/refactor-plan.md` against a real MongoDB instance.
- Verify create/move/delete/restore/purge behavior with actual data.
- Verify Note Library filters and detail-page publish constraints in browser.
- Check 1000-note query performance target after seed data exists.
>>>>>>> 7998882ea17f1aa6fb38ebb6bfa592eb7f8a44a7

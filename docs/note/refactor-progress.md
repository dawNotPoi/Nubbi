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

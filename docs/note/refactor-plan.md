# Nubbi Note 模型重构方案

## Context

当前 Note Schema 存在三层技术债：
1. **树结构双字段维护**（`parentId` + `children[]`）导致一致性风险和查询分裂
2. **`meta: Mixed` 作为垃圾桶**存放 status/tags/type，不可索引、不可校验，且 `findNotesByStatus` 因为读 `note.status` 而字段不存在，形同虚设
3. **递归查询 N+1** — `getAllChildren`、`getNoteAncestors`、`searchNotes` 的 `buildPathLabel` 都是逐层查 DB

核心方案：改为 `parentId + hasChildren`、status/tags/published/source 提升到顶层、meta 从扁平 Map 改为自描述数组、软删除 + 回收站。

---

## 第 1 步：Model 基座

### 1.1 Schema 重写

```ts
const noteSchema = new Schema({
  // ═══ 核心 ═══
  userId:      { type: String, index: true },
  title:       { type: String, default: 'New Note' },
  content:     { type: String, default: '' },
  author:      { type: String, default: null },

  // ═══ 树结构 ═══
  parentId:    { type: ObjectId, ref: 'Note', default: null, index: true },
  hasChildren: { type: Boolean, default: false },

  // ═══ 状态（双维度） ═══
  source:      { type: String, enum: ['user', 'agent'], default: 'user' },
  status:      { type: String, enum: ['inbox', 'active', 'done', 'archived'], default: 'inbox' },
  published:   { type: Boolean, default: false, index: true },

  // ═══ 组织 ═══
  tags:        { type: [String], default: [], index: true },

  // ═══ 展示 ═══
  cover:       { type: String, default: '' },
  password:    { type: String, default: null },
  date:        { type: Date, default: Date.now },

  // ═══ 软删除 ═══
  deletedAt:   { type: Date, default: null, index: true },
  expiresAt:   { type: Date, default: null },

  // ═══ 灵活扩展 ═══
  meta:        {
    type: [{
      key:   { type: String, required: true },
      value: { type: Mixed },
      type:  { type: String, default: 'text' },
    }],
    default: []
  },

}, { timestamps: true });
```

**删除字段**：`children`、`watched`、`like`

**新增字段**：`source`、`hasChildren`、`status`、`published`、`tags`、`author`、`deletedAt`、`expiresAt`

### 1.2 Status 状态机

```
source: 'user'                   source: 'agent'
  │                                  │
  │ 新建 → status=active             │ 摄入 → status=inbox
  │                                  │   │
  │                                  │   └── 用户打开编辑 → active（自动）
  ▼                                  ▼
┌──────────────────────────────────────────┐
│               active                      │
│  正在写（创作）/ 正在消化（阅读）           │
└──────────────────┬───────────────────────┘
                   │ 用户手动标记
                   ▼
┌──────────────────────────────────────────┐
│               done                        │
│  已完成 / 已内化                          │
│        │                                  │
│        └── published: true ──→ 已发布    │
└──────────────────┬───────────────────────┘
                   │ 手动归档
                   ▼
┌──────────────────────────────────────────┐
│             archived                      │
│  退出默认视图                             │
└──────────────────────────────────────────┘
```

**规则**：
- inbox → active：首次编辑 content
- active → done：用户手动
- done → archived：用户手动
- **不做方向限制**：用户可任意回退
- **published 约束**：只有 done / archived 才能 `published: true`

### 1.3 Meta 结构化

存储形式从扁平 `{ key: value }` 变为自描述数组：

```json
[
  { "key": "source_url",   "value": "https://...", "type": "url" },
  { "key": "isbn",         "value": "978-...",      "type": "text" },
  { "key": "duration_min", "value": 45,             "type": "number" }
]
```

- 每个条目自描述 key + value + type，UI 遍历即可渲染
- `type` 为自由 string，标准字段在常量表预定义类型
- 标准 key：`source_url`、`language`、`slug`、`excerpt`、`duration_min`、`channel`、`isbn`、`publisher`、`publication_year`、`page_count`
- 自定义 key：`_` 前缀，如 `_reading_time`、`_difficulty`

### 1.4 索引

```ts
noteSchema.index({ userId: 1, parentId: 1 });
noteSchema.index({ userId: 1, status: 1 });
noteSchema.index({ userId: 1, updatedAt: -1 });
noteSchema.index({ userId: 1, tags: 1 });
noteSchema.index({ published: 1, updatedAt: -1 });
```

### 1.5 Connection 配置加固

```ts
mongoose.connect(env.MONGO_URI, {
  dbName: env.MONGO_DB_NAME,
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  retryWrites: true,
  retryReads: true,
  authSource: 'admin',
});
```

### 1.6 Summary 模型修正

`server/app/models/summary.ts` 中 `noteId` 从 `String` 改为 `ObjectId`，与 Note 的 `_id` 类型一致。

### 1.7 查询兜底

所有无限制查询加 `.limit(500)`：`getAllNotes`、`getRootNotes`、`getDirectChildren`、`getRecentNotes`、`getNotes`。

### 1.8 回收站模块

Schema 预置两个字段：

```
deletedAt:  Date, default null, indexed    — 软删除时间
expiresAt:  Date, default null             — 自动清理时间，null=手动清理
```

生命周期：

```
   正常                   回收站                  已清理
┌─────────┐  DELETE   ┌─────────┐  到期/手动   ┌─────────┐
│  active  │ ────────→│  trash  │ ──────────→  │  purged  │
│deletedAt│          │deletedAt│             │ (物理删除) │
│  = null │ ←────────│ = now() │             └─────────┘
└─────────┘  RESTORE  └─────────┘
```

本期实现：
- Schema 字段 ✅
- 删除改软删除 ✅
- 查询过滤 `deletedAt: null` ✅
- `PUT /note/restore`（恢复）✅
- `GET /note/trash`（回收站列表）✅
- `DELETE /note/purge`（物理永久删除）✅

暂不做：定时任务、可配置过期时间、回收站 UI 面板、关联资源清理。

### 1.9 MongoDB 版本要求

| 特性 | 最低版本 | 用途 |
|------|---------|------|
| `$graphLookup` | 3.4 | 递归查后代 |
| Multi-document transactions | 4.0 | hasChildren 维护原子性 |

低于 4.0 时自动降级为递归 + 无事务模式。

---

## 第 2 步：数据库切换

修改 `server/.env`：

```diff
- MONGO_DB_NAME=Nubbi
+ MONGO_DB_NAME=Nubi-AI
```

新库 `Nubi-AI`，旧库 `Nubbi` 保留不动。无需迁移脚本。

---

## 第 3 步：服务端 Controller + Route 全量适配

### 3.1 Create — `server/app/controller/note/create.ts`

- 根据 `source` 决定初始 `status`：`'user'` → `'active'`，`'agent'` → `'inbox'`
- 创建时如果 `parentId` 非空，更新父节点 `hasChildren = true`
- 删除 `stripSummaryFromMeta`
- `duplicateNote` 适配新字段，meta 数组深拷贝

### 3.2 Update — `server/app/controller/note/update.ts`

- `updateNoteMeta`：parentId 变更时触发移动逻辑
  1. 查旧 parentId
  2. 更新 note.parentId = newParentId
  3. 旧父节点：`countDocuments({ parentId }) === 0` → `hasChildren = false`
  4. 新父节点：`hasChildren = true`
  5. 三步操作 MongoDB transaction 包裹
- 删除 `addWatchs`、`addLikes`

### 3.3 Delete / Restore / Purge — 回收站操作

- **软删除**：`$set: { deletedAt: new Date() }` + 后代递归标记 + 父节点重算
- **恢复**：`PUT /note/restore` → `deletedAt = null, expiresAt = null` + 后代同步
- **永久删除**：`DELETE /note/purge` → `deleteMany` 物理删除 + 父节点重算

### 3.4 Query — `server/app/controller/note/query.ts`

- 所有查询默认加 `{ deletedAt: null }` 过滤
- `getNotes` / `getRecentNotes`：用 `hasChildren: false` 判断叶子节点
- `findNotesByStatus` → `findNotesByFilter({ status?, tags?, published? })`
- 新增 `getTrashNotes(userId)`：返回已删除笔记
- 所有无限制查询加 `.limit(500)`

### 3.5 Routes — 最终 API

```
POST   /note/create       — 创建
PUT    /note/content       — 更新内容
PUT    /note/properties    — 更新属性 + 移动
PUT    /note/publish       — 快捷发布/取消（新增）
PUT    /note/restore       — 恢复（新增）
GET    /note/all           — 全量
GET    /note/roots         — 根节点
GET    /note/children      — 子节点
GET    /note/ancestors     — 面包屑
GET    /note/detail        — 单笔记含 content
GET    /note/recent        — 最近
GET    /note/trash         — 回收站（新增）
POST   /note/search        — 搜索
DELETE /note/delete        — 软删除（行为变更）
DELETE /note/purge         — 物理删除（新增）
```

---

## 第 4 步：客户端全量适配

### 4.1 API 类型层 `client/src/api/note.ts`

```ts
export interface MetaEntry {
  key: string;
  value: unknown;
  type: string;
}

export interface Note {
  _id: string;
  title: string;
  parentId?: string | null;
  hasChildren: boolean;
  source: 'user' | 'agent';
  status: 'inbox' | 'active' | 'done' | 'archived';
  published: boolean;
  tags: string[];
  author?: string | null;
  date?: string;
  deletedAt?: string | null;
  expiresAt?: string | null;
  cover: string;
  meta: MetaEntry[];
  createdAt?: string;
  updatedAt?: string;
}

export interface NoteWithContent extends Note {
  content?: string;
}
```

- `newNote()` 默认值更新
- 新增 `publishNote`、`restoreNote`、`purgeNote`、`getTrashNotes`

### 4.2 缓存层 `client/src/features/note/model/cache.ts`

- 删除 `getChildNoteIds`（曾依赖 `note.children` 数组）
- `collectNoteAndDescendantIds`：改为通过 `parentId` 反向构建后代集合
- 所有 optimistic update 适配新字段

### 4.3 组件逐文件适配

| 文件 | 变更 |
|------|------|
| `SideBar/NoteMenu/NoteTree.tsx` | `hasChildren` 替代 `children.length` 判断展开箭头 |
| `SideBar/NoteMenu/index.tsx` | Note 类型更新 |
| `features/note/hooks/useNoteEditorDraft.ts` | 适配新 Note 类型，首次编辑自动切 inbox→active |
| `features/note/hooks/useCreateNoteDraft.ts` | 新建笔记使用新默认值 |
| `features/note/model/hierarchy.ts` | 删除 `getNoteChildren`，重写 `collectBlockedMoveTargetIds` |
| `views/note/index.tsx` | published 开关、新字段展示 |
| `views/note/NoteCard.tsx` | status badge、tags、published 标记 |
| `views/note/NoteBreadcrumb.tsx` | 适配新接口 |
| `NoteLibrary.tsx` + 子组件 | 列定义更新、status/published 过滤 |
| `features/note/model/library.ts` | 适配新类型 |
| `features/note/components/NoteTargetPickerRow.tsx` | `hasChildren` 替代 `getNoteChildren` |
| `store/atom/noteAtom.ts` | 所有 mutation atom 适配新字段 |

### 4.4 新建文件 `shared/meta-field-defs.ts`

标准 meta key 类型定义表，前后端共享。

---

## 第 5 步：端到端回归验证

### 功能验证

- [ ] 用户新建笔记 → `source='user'`, `status='active'`（直接可编辑）
- [ ] Agent 创建笔记 → `source='agent'`, `status='inbox'`
- [ ] inbox 笔记首次编辑 → status 自动切 `active`
- [ ] 创建子笔记 → 父节点 `hasChildren=true`
- [ ] 移动笔记 → 新旧父节点 `hasChildren` 双向正确
- [ ] 软删除 → 后代全部标记，父节点重算，列表不显示
- [ ] 恢复 → `deletedAt` 置 null，回到正常列表
- [ ] 物理删除 → 笔记及后代从数据库消失
- [ ] 回收站列表 → 已删除笔记按时间倒序
- [ ] 笔记库 status/published/tags 过滤正常
- [ ] `PUT /publish` 拒绝 inbox/active 状态
- [ ] 搜索 + 面包屑路径正确

### 性能验证

- 1000 条笔记下，`getAllNotes` < 500ms
- 侧边栏展开/折叠无延迟

---

## 依赖关系图

```
第 1 步 (Model 基座: Schema + Connection + 索引 + Summary 修正 + 回收站 Schema)
  │
  ▼
第 2 步 (数据库切换: .env 改库名 → Nubi-AI)
  │
  ▼
第 3 步 (服务端全量适配: Create/Update/Delete/Query/Routes + Zod + 事务 + 回收站 CRUD)
  │
  ▼
第 4 步 (客户端全量适配: API 类型 → 缓存 → 组件 → 状态管理)
  │
  ▼
第 5 步 (E2E 回归验证)
```

## 风险点与缓解

| 风险 | 缓解措施 |
|------|---------|
| `hasChildren` 并发竞态 | `countDocuments` 重算 + MongoDB transaction |
| `$graphLookup` 不支持 | 自动降级为递归查询 |
| 客户端缓存不一致 | TypeScript 严格类型检查，编译错误暴露遗漏 |
| 查询遗漏 `deletedAt` 过滤 | Controller 层统一模板 |
| `/roots` 和 `/getNote` 无鉴权 | 标记为安全审计项（可能为 public share 设计） |
| 回收站无自动清理 | 暂手动清理，cron 后续实现 |

## 文件变更总览

| 文件 | 步 | 变更类型 |
|------|----|---------|
| `server/app/models/note.ts` | 1 | 完整重写 |
| `server/app/models/summary.ts` | 1 | noteId 类型修正 |
| `server/app/lib/db.ts` | 1 | Connection 配置加固 |
| `server/.env` | 2 | MONGO_DB_NAME → Nubi-AI |
| `server/app/controller/note/create.ts` | 3 | 适配新 Schema + hasChildren |
| `server/app/controller/note/update.ts` | 3 | 适配 + moveNote + transaction |
| `server/app/controller/note/delete.ts` | 3 | 软删除 + 恢复 + 物理删除 + $graphLookup |
| `server/app/controller/note/query.ts` | 3 | 适配新字段 + findNotesByFilter + getTrashNotes |
| `server/app/routes/note.ts` | 3 | Zod 更新 + 4 个新路由 |
| `client/src/api/note.ts` | 4 | 类型 + 函数重写 |
| `client/src/features/note/model/cache.ts` | 4 | children → hasChildren + parentId |
| `client/src/features/note/model/types.ts` | 4 | 类型适配 |
| `client/src/features/note/model/hierarchy.ts` | 4 | 删除 getNoteChildren |
| `client/src/features/note/model/library.ts` | 4 | 类型适配 |
| `client/src/features/note/hooks/` | 4 | 默认值 + 类型适配 + inbox→active |
| `client/src/features/note/components/` | 4 | 表格列 + 过滤 + hasChildren |
| `client/src/component/SideBar/NoteMenu/` | 4 | hasChildren 适配 |
| `client/src/views/note/` | 4 | 新字段展示 |
| `client/src/store/atom/noteAtom.ts` | 4 | 类型适配 |
| `shared/meta-field-defs.ts` | 4 | 新建：标准 meta key 类型定义 |

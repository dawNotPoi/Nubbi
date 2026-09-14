# 笔记模块 PRD（重构版）

## 模块概述

笔记是 Nubbi 的核心业务模块。本次重构将数据模型从松散 Mixed 升级为结构化 Schema，为后续 MCP、知识库 RAG、博客发布等能力提供坚实基础。

**重构目标**：
1. 清理死字段，统一数据模型
2. 引入双维度状态管理（认知流程 + 发布开关）
3. 树结构从双字段维护简化为 parentId + hasChildren
4. 标签提升为顶层可索引字段
5. meta 保留灵活扩展但约定标准键名
6. 编辑器输出格式从 HTML 切换到 Markdown

---

## 数据模型

### 最终 Schema

```ts
const noteSchema = new Schema({

  // ═══════════════════════════════════
  // 核心
  // ═══════════════════════════════════
  userId:      { type: String, index: true },
  title:       { type: String, default: 'New Note' },
  content:     { type: String, default: '' },          // Markdown
  author:      { type: String, default: null },

  // ═══════════════════════════════════
  // 树结构
  // ═══════════════════════════════════
  parentId:    { type: ObjectId, ref: 'Note', default: null, index: true },
  hasChildren: { type: Boolean, default: false },

  // ═══════════════════════════════════
  // 状态
  // ═══════════════════════════════════
  status:      { type: String, enum: ['inbox','reading','done','archived'], default: 'inbox' },
  published:   { type: Boolean, default: false, index: true },

  // ═══════════════════════════════════
  // 组织
  // ═══════════════════════════════════
  tags:        { type: [String], default: [], index: true },

  // ═══════════════════════════════════
  // 展示
  // ═══════════════════════════════════
  cover:       { type: String, default: '' },
  password:    { type: String, default: null },
  date:        { type: Date, default: null },          // 内容原始日期

  // ═══════════════════════════════════
  // 灵活元数据
  // ═══════════════════════════════════
  meta:        { type: Mixed, default: {} },

}, { timestamps: true });
```

### 字段变更对照

| 字段 | 旧版 | 新版 | 变更 |
|------|------|------|------|
| `userId` | String, index | 不变 | — |
| `title` | String, default "New Note" | 不变 | — |
| `content` | String (HTML/JSON) | String (**Markdown**) | 格式变更 |
| `author` | — | String, default null | **新增** |
| `parentId` | ObjectId, ref Note | 不变 | — |
| `children` | [ObjectId] | — | **删除** |
| `hasChildren` | — | Boolean, default false | **新增** |
| `status` | (无 schema 定义) | enum inbox/reading/done/archived | **新增（规范化）** |
| `published` | — | Boolean, default false | **新增** |
| `tags` | (meta.tags / 顶层混乱) | [String], index | **规范化到顶层** |
| `type` | (无 schema，仅 client 硬编码) | — | **删除** |
| `watched` | Number | — | **删除** |
| `like` | Number | — | **删除** |
| `cover` | String | 不变 | — |
| `password` | String, default null | 不变 | — |
| `date` | Date, default Date.now() | Date, **default null** | 语义变更 |
| `meta` | Mixed | Mixed（标准键名约定） | 保留灵活 |
| `createdAt` | timestamps | timestamps | — |
| `updatedAt` | timestamps | timestamps | — |

### 标准 Meta 字段约定（不在 Schema 层强制）

```
通用：
  source_url:  string     原始链接
  language:    string     语言代码（zh/en/ja...）

Video：
  duration_min: number    视频时长（分钟）
  channel:      string    频道名

Book：
  isbn:              string   ISBN
  publisher:         string   出版社
  publication_year:  number   出版年份
  page_count:        number   页数

博客发布：
  slug:     string     URL 别名
  excerpt:  string     摘要（用于列表卡片）

自定义：
  _xxx:     any        用户自定义字段（_ 前缀区分）
```

---

## 状态流转

```
┌──────────────────────────────────────────────────┐
│              status（认知处理流程）                 │
│                                                  │
│   inbox ──→ reading ──→ done ──→ archived        │
│   待处理     处理中      已内化      归档          │
│     │                                              │
│     └────────────────→ archived（直接归档）         │
│                                                  │
│   触发方：                                        │
│   inbox    ← Agent (ingest_url)、用户新建         │
│   reading  ← 用户打开编辑（自动切换）               │
│   done     ← 用户手动标记                          │
│   archived ← 用户手动或自动（x天不活跃，未来可配置）  │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│           published（发布开关）                     │
│                                                  │
│   false ───────────────────→ true                │
│   私有/草稿                   公开/已发布           │
│                                                  │
│   触发方：                                        │
│   false → true  用户主动发布                       │
│   true  → false 用户取消发布                       │
└──────────────────────────────────────────────────┘
```

两者独立。常见组合：
- `inbox + false` — Agent 刚收进来
- `reading + false` — 正在写
- `done + false` — 私人笔记，已消化
- `done + true` — 已发布的博客文章

---

## 编辑器方案

**保留 Tiptap**，输出格式切换为 Markdown。

实现方式：
- 使用 `@tiptap/extension-markdown` 或自定义 serializer
- 编辑器内部仍使用 ProseMirror JSON 状态
- 保存时序列化为 Markdown 字符串
- 加载时从 Markdown 解析回 ProseMirror 状态

现有 Tiptap 自定义 extension 大部分兼容：
- `slash-command` — 保留
- `image` — 保留（上传到 GitHub 图床）
- `code-block` — 保留
- `FormatBubbleMenu` — 保留

---

## API 变更

### `POST /note/create`

```ts
// 旧 Zod
z.object({
  title: z.string(),
  content: z.string().optional(),
  parentId: z.string().nullable().optional(),
  meta: z.record(z.any()).optional(),
})

// 新 Zod
z.object({
  title: z.string().min(1).max(200).default('New Note'),
  content: z.string().default(''),
  parentId: z.string().nullable().default(null),
  status: z.enum(['inbox','reading','done','archived']).default('inbox'),
  published: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  author: z.string().nullable().default(null),
  date: z.union([z.string(), z.number()]).nullable().default(null),  // ISO string or timestamp
  cover: z.string().default(''),
  meta: z.record(z.any()).default({}),
})
```

### `PUT /note/content`

```ts
// 不变（仍然 noteId + content），content 格式变为 Markdown
z.object({
  noteId: z.string().min(1),
  content: z.string(),
})
```

### `PUT /note/properties`

```ts
// 旧 Zod
z.object({
  noteId: z.string().min(1),
  title: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["Draft", "Published", "Archived"]).optional(),
  parentId: z.string().nullable().optional(),
  meta: z.record(z.any()).optional(),
  cover: z.string().optional(),
})

// 新 Zod
z.object({
  noteId: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
  status: z.enum(['inbox','reading','done','archived']).optional(),
  published: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  author: z.string().nullable().optional(),
  date: z.union([z.string(), z.number()]).nullable().optional(),
  parentId: z.string().nullable().optional(),  // 移动笔记
  cover: z.string().optional(),
  meta: z.record(z.any()).optional(),
})
```

### 新增 `PUT /note/publish`

快捷发布/取消发布：

```ts
// POST body
z.object({
  noteId: z.string().min(1),
  published: z.boolean(),
})

// 等同于 PUT /note/properties { published: true/false }，但语义更清晰
```

### 移动笔记：`parentId` 变更时的 hasChildren 维护

```
操作：PUT /note/properties { noteId: A, parentId: B }
  
  → 查找 A 的旧 parentId (oldP)
  → 设置 A.parentId = B
  → 检查 oldP 是否还有其他子节点
    ├─ 无 → oldP.hasChildren = false
    └─ 有 → 不变
  → B.hasChildren = true（如果是 null 则跳过）
```

### 删除笔记：hasChildren 维护

```
操作：DELETE /note/delete { noteId: A }

  → 查找 A.parentId (P)
  → 递归删除 A 及所有后代
  → 检查 P 是否还有其他子节点
    ├─ 无 → P.hasChildren = false
    └─ 有 → 不变
```

### 查询端点：不变

所有查询端点保持不变，只是返回的字段集合更新（新增 status/published/tags/author/hasChildren，移除 children/watched/like）。

---

## 服务端变更清单

### Model
| 文件 | 变更 |
|------|------|
| `server/app/models/note.ts` | 完整重写 Schema |

### Controller
| 文件 | 变更 |
|------|------|
| `server/app/controller/note/create.ts` | 新增字段支持；创建子笔记时更新父节点的 hasChildren；移除旧 `stripSummaryFromMeta` 逻辑 |
| `server/app/controller/note/update.ts` | `updateNoteMeta` 新增字段支持；新增 `moveNote` 含 hasChildren 双向维护；移除 `addWatchs`/`addLikes` |
| `server/app/controller/note/delete.ts` | 删除后更新父节点 hasChildren |
| `server/app/controller/note/query.ts` | `findNotesByStatus` 重构为 `findNotesByFilter({status?, tags?, published?})`；`getTagStats` 改为读顶层 tags；`getNotes` 不再依赖 children 字段；新增 `getNoteStats` 适配新 status 枚举 |

### Route
| 文件 | 变更 |
|------|------|
| `server/app/routes/note.ts` | 全部 Zod 验证更新；新增 `/publish` 路由；移除旧 tags/status 混乱引用 |

### Middleware / 其他
| 文件 | 变更 |
|------|------|
| `server/app/routes/utils.ts` | 不变 |

---

## 客户端变更清单

### API 层
| 文件 | 变更 |
|------|------|
| `client/src/api/note.ts` | 重定义 `Note` 接口（移除 children/watched/like，新增 status/published/tags/author/hasChildren）；更新 `updateNoteProperties` 参数类型；`newNote()` 默认值更新；新增 `publishNote()` |

### 类型层
| 文件 | 变更 |
|------|------|
| `client/src/features/note/model/types.ts` | `NotePropertiesInput` 更新；`UpdateNotePropertiesVariables` 更新 |

### 编辑器
| 文件 | 变更 |
|------|------|
| `client/src/component/editor/Tiptap/index.tsx` | 接入 Markdown serializer；保存时输出 MD，加载时解析 MD；保留现有 extension |
| `client/src/component/editor/Tiptap/extensions/*` | 不变（image/slash-command/code-block 兼容） |

### Meta 面板（完全重写）
| 文件 | 变更 |
|------|------|
| `client/src/views/note/NoteMeta.tsx` | 重写为动态面板（见下方设计） |

### 其他页面组件
| 文件 | 变更 |
|------|------|
| `client/src/views/note/index.tsx` | 适配新 Note 接口；published 开关位置 |
| `client/src/views/note/NoteCard.tsx` | 显示 status badge、tags、published 标记 |
| `client/src/views/note/NoteBreadcrumb.tsx` | 适配新接口 |
| `client/src/views/NoteLibrary.tsx` | 新增 status/published 过滤；适配新 Note 类型 |
| `client/src/features/note/components/NoteLibraryTable.tsx` | 列定义更新 |
| `client/src/features/note/components/NoteLibraryToolbar.tsx` | 新增 status 过滤下拉；published 过滤 checkbox |
| `client/src/features/note/model/library.ts` | 适配新类型 |
| `client/src/features/note/hooks/useNoteLibraryController.ts` | 适配新接口 |

### 侧边栏
| 文件 | 变更 |
|------|------|
| `client/src/component/SideBar/NoteMenu/NoteTree.tsx` | 使用 `hasChildren` 判断展开箭头；不再读取 `children[]` |
| `client/src/component/SideBar/NoteMenu/index.tsx` | 适配新接口 |

### 状态管理
| 文件 | 变更 |
|------|------|
| `client/src/store/atom/noteAtom.ts` | 适配新 Note 类型；`patchNoteAcrossCaches` 适配新字段 |
| `client/src/features/note/model/cache.ts` | 适配新字段名 |
| `client/src/features/note/model/keys.ts` | 不变（key 结构不变） |
| `client/src/features/note/model/hierarchy.ts` | 适配 hasChildren |

---

## NoteMeta 动态面板设计

### 设计思路

Meta 面板支持三类字段，按不同策略渲染：

**1. 顶层字段（固定渲染）**

直接在面板顶部显示，固定布局：

| 字段 | 控件 | 说明 |
|------|------|------|
| `title` | Input | 笔记标题，已有独立组件 |
| `author` | Input | 作者 |
| `date` | DatePicker | 内容原始日期 |
| `status` | Select (inbox/reading/done/archived) | 下拉选择 |
| `published` | Switch | 发布开关 |
| `tags` | Select (multiple, creatable) | 自由标签，自动补全 |
| `cover` | Upload + Preview | 封面图片 |

**2. 标准 Meta 字段（按 key 渲染）**

遍历 `STANDARD_META_SCHEMA`，只渲染 meta 中有值的标准字段：

```ts
const STANDARD_META_SCHEMA: MetaFieldDef[] = [
  { key: 'source_url',    type: 'url',      label: '来源链接',  icon: Link },
  { key: 'language',      type: 'select',   label: '语言',     icon: Globe, options: ['zh','en','ja'] },
  { key: 'slug',          type: 'text',     label: 'URL 别名',  icon: Hash },
  { key: 'excerpt',       type: 'textarea', label: '摘要',     icon: FileText },
  { key: 'duration_min',  type: 'number',   label: '时长(分钟)', icon: Clock },
  { key: 'channel',       type: 'text',     label: '频道',     icon: Video },
  { key: 'isbn',          type: 'text',     label: 'ISBN',    icon: Book },
  { key: 'publisher',     type: 'text',     label: '出版社',    icon: Book },
  { key: 'publication_year', type: 'number', label: '出版年份',  icon: Calendar },
  { key: 'page_count',    type: 'number',   label: '页数',     icon: BookOpen },
];
```

- **未填值的字段默认隐藏**，点击「+ 添加属性」下拉选择要添加的标准字段
- 已填值的字段正常显示，每行展示 label + 对应控件
- 清空值后字段恢复隐藏

**3. 自定义字段（_ 前缀）**

- 点击「+ 自定义字段」弹出小表单：key（输入）、type（下拉：text/number/date/url/textarea/switch）
- 已添加的自定义字段以 `key: value` 行展示，控件类型由添加时选的 type 决定
- 每行右侧有删除按钮（x），删除后同时从 meta 中移除
- 自定义字段始终显示（不隐藏），否则用户找不到

### 交互布局

```
┌─────────────────────────────────┐
│ 属性                            │
│                                 │
│ 作者      [________________]    │  ← 顶层字段
│ 日期      [📅 2026-06-10   ]    │
│ 状态      [done       ▾    ]    │
│ 发布      [====○]              │
│ 标签      [AI] [RAG] [+添加]   │
│                                 │
│ ── 元数据 ──────────────────── │
│                                 │
│ 🌐 来源链接                     │  ← 标准 meta（有值）
│ [https://example.com/...    ]   │
│                                 │
│ 📝 摘要                         │
│ [本文介绍了 RAG 架构的...   ]   │
│                                 │
│ ── 自定义 ──────────────────── │
│                                 │
│ _reading_time: 15         [×]   │  ← 自定义字段
│ _difficulty: 中级         [×]   │
│                                 │
│ [+ 添加标准属性] [+ 自定义字段]   │
└─────────────────────────────────┘
```

---

## 数据迁移

### 结论：不需要迁移

用户确认现有笔记内容已经是 Markdown 格式。只需要处理 Schema 字段变更：

```ts
// scripts/migrate-note-v2.ts —— 一次性执行

// 1. 为所有笔记设置默认值
await Note.updateMany({}, {
  $set: {
    status: 'done',        // 旧笔记默认 done（已消化）
    published: false,
    hasChildren: false,
    author: null,
    date: null,
  },
  $unset: {
    children: '',          // 删除旧 children 数组
    watched: '',
    like: '',
  }
});

// 2. 如果旧版 tags 存在 meta.tags 中，迁移到顶层
const notes = await Note.find({ tags: { $exists: false } });
for (const note of notes) {
  if (note.meta?.tags && Array.isArray(note.meta.tags)) {
    note.tags = note.meta.tags;
    delete note.meta.tags;
    await note.save();
  }
}

// 3. 重建 hasChildren
//    找到所有有子节点的 note，设置 hasChildren = true
const parents = await Note.distinct('parentId', { parentId: { $ne: null } });
await Note.updateMany(
  { _id: { $in: parents } },
  { $set: { hasChildren: true } }
);

// 4. 日期处理
//    date 字段从"创建时 Date.now()"变为"内容原始日期"
//    旧值不准确，设为 null
await Note.updateMany({}, { $set: { date: null } });
```

---

## 实施顺序

按依赖关系排序，最小可验证单元：

### 第 1 步：Model + 迁移（服务器端基础）
1. `server/app/models/note.ts` — Schema 重写
2. `scripts/migrate-note-v2.ts` — 数据迁移
3. 执行迁移 → 验证数据完整性

### 第 2 步：Controller + Route（服务器端 API）
4. `server/app/controller/note/create.ts` — 含 hasChildren 维护
5. `server/app/controller/note/update.ts` — 移动 + 属性更新
6. `server/app/controller/note/delete.ts` — 含 hasChildren 清理
7. `server/app/controller/note/query.ts` — 查询适配
8. `server/app/routes/note.ts` — Zod 更新

### 第 3 步：客户端 API 层
9. `client/src/api/note.ts` — 类型 + 函数更新

### 第 4 步：编辑器 Markdown 适配
10. Tiptap serializer — 保存输出 MD，加载解析 MD
11. 验证：新建/编辑/保存 → 数据库存的是 Markdown

### 第 5 步：Meta 面板
12. `client/src/views/note/NoteMeta.tsx` — 重写
13. `client/src/views/note/NoteCard.tsx` — 适配
14. `client/src/views/note/index.tsx` — 适配

### 第 6 步：侧边栏
15. `NoteTree.tsx` — hasChildren 适配
16. `NoteMenu/index.tsx` — 适配

### 第 7 步：笔记库
17. `NoteLibrary.tsx` + 子组件 — status/published 过滤
18. `features/note/` 相关文件 — 类型 + 逻辑适配

### 第 8 步：状态管理 + 缓存
19. `noteAtom.ts` + `cache.ts` — 适配

### 第 9 步：端到端验证
20. 全流程回归测试

---

## 验收标准

- [ ] 新建笔记，所有字段（status/published/tags/author/date/meta）可正确写入和读取
- [ ] 移动笔记到新父节点，旧父节点和新父节点的 hasChildren 正确更新
- [ ] 删除最后一个子笔记，父节点 hasChildren 变为 false
- [ ] 删除有子笔记的节点，递归删除全部后代
- [ ] 编辑器保存后，content 字段存储的是 Markdown 格式文本
- [ ] 编辑器加载 Markdown 内容，正确渲染为富文本
- [ ] NoteMeta 面板显示所有有值的标准字段 + 自定义字段
- [ ] 自定义字段可添加、编辑、删除
- [ ] 侧边栏树形组件展开/折叠正常，依赖 hasChildren
- [ ] 笔记库可按 status、published、tags 过滤
- [ ] 旧笔记迁移后 status=done, published=false，内容不受影响
- [ ] API 返回的 Note 对象不包含 children/watched/like 字段

---

## 依赖关系

- 被 **knowledge-base Phase 2**（MCP Server 依赖规范化 Note 接口）
- 被 **knowledge-base Phase 3**（embedding 依赖 Markdown 内容 + status 过滤）
- 被 **博客系统**（published + slug + excerpt）

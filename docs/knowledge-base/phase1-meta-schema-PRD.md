# Phase 1：Meta Schema 标准化 PRD

## 模块概述

将 Note 的 `meta: Mixed` 从不规范自由态升级为结构化方案，让 agent 可靠读写元数据，客户端按 type 动态渲染编辑面板。

**涉及模块**：`note`（修改现有）
**关联 PRD**：`docs/note/PRD.md`

---

## 背景

### 现状问题

- `meta: Mixed` 无任何结构约束，agent 不知道里面有什么字段、类型是什么
- 不同类型的 note（文章、视频、书）需要不同的元数据，但目前统一处理
- 客户端 `NoteMeta.tsx` 中字段硬编码，不支持扩展

### 设计原则

1. **不破坏**：已有的 `meta` 数据全部保留，只做增量
2. **约定优于强制**：meta 保持 Mixed 允许自定义字段，标准键名是约定，写入时做软校验（warn 日志）不拒绝
3. **可扩展**：UI 支持用户自行添加任意 key-value 对

---

## 数据模型变更

### Note Schema（`server/app/models/note.ts`）

**新增字段 `type`**：

```ts
type: {
  type: String,
  enum: ['raw', 'article', 'video', 'book', 'link'],
  default: 'raw',
  index: true,
}
```

### 标准 Meta 字段定义

以下为标准键名约定，存储在 `meta` 对象中。`*` 表示适用所有类型：

| 字段名 | 类型 | 适用 type | 说明 | 是否必填 |
|-------|------|----------|------|---------|
| `tags` | `string[]` | * | 标签集，可被搜索、过滤 | 否 |
| `status` | `enum` | * | `inbox` / `reading` / `done` / `archived` | 否 |
| `rating` | `number` | * | 评分 1–5 | 否 |
| `ai_summary` | `string` | * | AI 生成摘要，系统写入，用户只读 | 否 |
| `source_url` | `string` | article, video, link | 原始来源链接 | 建议填写 |
| `author` | `string` | article, book | 作者/作者列表 | 否 |
| `language` | `string` | article, video, book | 语言代码 `zh`/`en`/`ja`... | 否 |
| `duration_min` | `number` | video | 视频时长（分钟） | 否 |
| `channel` | `string` | video | 频道名称 | 否 |
| `isbn` | `string` | book | ISBN 编号 | 否 |
| `publisher` | `string` | book | 出版社 | 否 |
| `publication_year` | `number` | book | 出版年份 | 否 |
| `page_count` | `number` | book | 总页数 | 否 |
| `domain` | `string` | link | 域名，如 `github.com` | 否 |

**自定义字段**：
- 用户可以添加任意不在上述列表中的 key-value 对
- UI 提供「+ 添加自定义字段」按钮
- 自定义字段的 key 以下划线 `_` 开头以区分标准字段（如 `_my_custom_field`）

---

## API 变更

### `POST /note/create`

Body 新增字段：

```json
{
  "title": "笔记标题",
  "content": "...",
  "parentId": null,
  "type": "article",
  "meta": {
    "source_url": "https://example.com",
    "author": "张三",
    "tags": ["AI", "RAG"],
    "status": "reading"
  }
}
```

### `PUT /note/properties`

Body 新增 `type` 字段，允许切换笔记类型：

```json
{
  "noteId": "...",
  "type": "video",
  "meta": {
    "channel": "3Blue1Brown",
    "duration_min": 22
  }
}
```

**软校验**：切换 type 时，不删除旧 type 下的特有字段，只记录 warn 日志。例如从 `book` 切到 `article`，`isbn` 保留在 meta 中但不显示。

### Zod 验证更新（`server/app/routes/note.ts`）

```ts
const createNoteSchema = z.object({
  title: z.string().min(1).max(200).default('New Note'),
  content: z.string().default(''),
  parentId: z.string().optional(),
  type: z.enum(['raw', 'article', 'video', 'book', 'link']).default('raw'),
  meta: z.record(z.any()).default({}),
});

const updatePropertiesSchema = z.object({
  noteId: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
  type: z.enum(['raw', 'article', 'video', 'book', 'link']).optional(),
  meta: z.record(z.any()).optional(),
  cover: z.string().optional(),
});

// 按 type 做软校验的辅助函数
function validateMetaByType(type: string, meta: Record<string, any>): string[] {
  // 返回警告列表，不抛出错误
  const warnings: string[] = [];
  // ... 检查各字段类型
  return warnings;
}
```

---

## 客户端变更

### `client/src/views/note/NoteMeta.tsx`（重构）

**当前**：硬编码渲染几个字段（标题、状态、标签、日期、封面）

**改造后**：

1. **顶部**：Type 选择器（下拉，raw/article/video/book/link）
2. **按 Type 分组渲染**：
   - 通用字段（任何 type）：tags、status、rating
   - article 特有：source_url、author、language
   - video 特有：source_url、channel、duration_min、language
   - book 特有：author、isbn、publisher、publication_year、page_count、language
   - link 特有：source_url、domain
3. **自定义字段区**：列出所有 `_` 开头的 key，支持增删改
4. **ai_summary**：只读文本框，灰色背景，标注 "AI 生成"

**组件接口**：

```tsx
interface NoteMetaProps {
  noteId: string;
  type: NoteType;
  meta: Record<string, any>;
  onTypeChange: (type: NoteType) => void;
  onMetaChange: (meta: Record<string, any>) => void;
}
```

**Type 选择器切换行为**：
- 切换 type 后，**不删除**旧字段，只**切换显示的编辑面板**
- 旧 type 特有字段保留在 meta 中，切回去时仍然可见

### `client/src/views/note/NoteCard.tsx`（小幅修改）

展示 Type 标签（小 badge），如 `📄 文章`、`🎬 视频`、`📖 书`

### 客户端 API 类型（`client/src/api/note.ts`）

```ts
type NoteType = 'raw' | 'article' | 'video' | 'book' | 'link';

interface NoteMeta {
  tags?: string[];
  status?: 'inbox' | 'reading' | 'done' | 'archived';
  rating?: number;
  ai_summary?: string;
  source_url?: string;
  author?: string;
  language?: string;
  duration_min?: number;
  channel?: string;
  isbn?: string;
  publisher?: string;
  publication_year?: number;
  page_count?: number;
  domain?: string;
  // 允许自定义字段
  [key: `_${string}`]: any;
}

interface CreateNoteParams {
  title?: string;
  content?: string;
  parentId?: string;
  type?: NoteType;
  meta?: Partial<NoteMeta>;
}

interface UpdateNotePropertiesParams {
  noteId: string;
  title?: string;
  type?: NoteType;
  meta?: Partial<NoteMeta>;
  cover?: string;
}
```

---

## 数据迁移

### 迁移脚本 `scripts/migrate-note-meta.ts`

```ts
// 一次性执行，为所有旧 note 补充默认 type
import mongoose from "@/lib/db";
import Note from "@/models/note";

async function migrate() {
  const result = await Note.updateMany(
    { type: { $exists: false } },
    { $set: { type: 'raw' } }
  );
  console.log(`已迁移 ${result.modifiedCount} 条笔记`);
  // 如旧版有独立 tags 字段，迁移到 meta.tags
  const notesWithTags = await Note.find({ tags: { $exists: true, $ne: [] } });
  for (const note of notesWithTags) {
    const oldTags = (note as any).tags;
    if (oldTags && oldTags.length > 0) {
      note.meta = { ...(note.meta || {}), tags: oldTags };
      await note.save();
    }
  }
  console.log(`已迁移 ${notesWithTags.length} 条标签`);
  process.exit(0);
}

migrate().catch(err => { console.error(err); process.exit(1); });
```

**执行方式**：
```bash
cd server && npx tsx ../scripts/migrate-note-meta.ts
```

---

## 实施顺序

1. **Model**：`server/app/models/note.ts` — 新增 `type` 字段
2. **Route**：`server/app/routes/note.ts` — Zod 验证更新 + 软校验
3. **迁移**：`scripts/migrate-note-meta.ts` — 执行一次数据迁移
4. **API 类型**：`client/src/api/note.ts` — 更新 TypeScript 类型
5. **Meta 面板**：`client/src/views/note/NoteMeta.tsx` — 重构为动态面板
6. **卡片**：`client/src/views/note/NoteCard.tsx` — 展示 type 标签

---

## 验收标准

- [ ] 新笔记可通过 `POST /note/create` 传入 `type` 和完整 `meta` 创建成功
- [ ] `PUT /note/properties` 可修改 type，切换后旧字段不丢失
- [ ] 旧笔记（无 type）迁移后默认为 `raw`
- [ ] `NoteMeta.tsx` 根据 type 显示对应编辑字段，切换 type 面板即时变化
- [ ] 自定义字段可添加、编辑、删除，以 `_` 前缀区分
- [ ] `ai_summary` 字段只读，不可编辑
- [ ] NoteCard 展示正确的 type 标签

---

## 依赖关系

- 依赖 **note** 模块（修改现有模型、路由、页面）
- 被 Phase 2、3 依赖（MCP 和知识库依赖结构化 meta）

---

## 估时

**1 周**（约 5 个工作日）

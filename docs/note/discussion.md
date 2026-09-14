# Note 模块 讨论记录

## [2026-06-14] 第 1 轮：数据模型重构

### 已决策

| # | 决策 | 理由 |
|---|------|------|
| 1 | 删除 `children[]`，只留 `parentId` + 新增 `hasChildren` | children 从未被实际查询使用，双向维护易不一致 |
| 2 | 任何 note 都能当文件夹 | 保持灵活性，无需 Folder/Note 分离 |
| 3 | 状态双维度：`status`(inbox/reading/done/archived) + `published`(boolean) | 认知流程和发布控制独立；published 只是一个开关 |
| 4 | `tags` 提升为顶层 `string[]`，自由创建 | 需要索引和过滤，放 meta Mixed 不可靠 |
| 5 | `date` 保留字段名改语义：内容原始日期（可空）| 对应 Markdown frontmatter 约定俗成的 date |
| 6 | `author` 新增为顶层可选字段 | 博客发布需要，比塞在 meta 里更直观 |
| 7 | 删除 `type`、`watched`、`like` | 文件夹取代 type；社交功能知识库不需要 |
| 8 | `content` 存储 Markdown | 统一格式，方便外部渲染和 embedding |
| 9 | 删除 `contentText` | Markdown 天然就是纯文本，不需要冗余字段 |
| 10 | `summary` 用专用 Summary Model，不放 meta | 已有 `server/app/models/summary.ts` |
| 11 | 编辑器保留 Tiptap，序列化层切换为 Markdown 输出 | 不换编辑器框架，降低迁移成本 |
| 12 | note `_id` 改为服务端生成 | 去掉客户端 bson 依赖，标准化 REST |
| 13 | 新建笔记乐观更新：onMutate 预填 detail 缓存 | 解决新建→跳转时 noteDetailAtom 发 GET 404 的问题 |
| 14 | 创建成功后 `replaceNoteIdInAllCaches(tempId → realId)` + URL replace | 服务端生成 _id 后无缝替换临时 ID |
| 15 | Meta 面板三区布局：顶层固定字段 / 标准 meta(有值才显示) / 自定义字段(_前缀) | 用户指定自定义字段 type 来渲染不同控件 |

### 模型最终形态

```ts
const noteSchema = new Schema({
  // 核心
  userId, title, content(Markdown), author,
  // 树结构
  parentId, hasChildren,
  // 状态
  status(enum: inbox/reading/done/archived), published(boolean),
  // 组织
  tags(string[]),
  // 展示
  cover, password, date(内容原始日期),
  // 灵活
  meta(Mixed),
}, { timestamps: true });
```

共 14 个字段。meta 标准约定：source_url, language, duration_min, channel, isbn, publisher, publication_year, page_count, slug, excerpt, _xxx(自定义)。

### 关键上下文

- 当前分支：`feat/note-model-refactor`
- PRD 已更新：`docs/note/PRD.md`
- 还需讨论：具体实施方案（待用户说开始）
- 已有体系：乐观更新缓存层（`client/src/features/note/model/cache.ts`），Jotai + TanStack Query
- 核心待验证：新建→跳转的场景下 noteDetailAtom 缓存命中；Tiptap 空内容兼容

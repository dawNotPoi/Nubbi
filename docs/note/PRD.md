# 笔记模块 PRD

## 模块概述

笔记是 Nubbi 的核心业务模块，支持树形笔记结构、富文本编辑、元数据管理。

**服务端**: `server/app/routes/note.ts` + `server/app/controller/note/` + `server/app/models/note.ts`
**客户端**: `client/src/views/note/`（编辑器） + `client/src/views/NoteLibrary.tsx`（笔记库） + `client/src/features/note/`

---

## 数据模型

```
Note {
  userId:    string          // 所属用户 ID
  title:     string          // 标题，默认 "New Note"
  content:   string          // 内容（HTML/JSON），默认 ""
  watched:   number          // 查看次数
  like:      number          // 点赞数
  password:  string | null   // 访问密码
  cover:     string          // 封面图片 URL
  children:  ObjectId[]      // 子笔记 ID 列表
  parentId:  ObjectId | null // 父笔记 ID
  date:      Date            // 创建日期
  meta:      Mixed           // 自定义元数据（任意 key-value）
  createdAt: Date            // 创建时间
  updatedAt: Date            // 更新时间
}
```

---

## API 端点

### 创建
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/note/create` | 创建笔记。body: `{ title, content?, parentId?, meta? }` |

### 更新
| 方法 | 路径 | 说明 |
|------|------|------|
| PUT | `/note/content` | 更新内容。body: `{ noteId, content }` |
| PUT | `/note/properties` | 更新属性。body: `{ noteId, title?, tags?, status?, parentId?, meta?, cover? }` |

### 查询
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/note/all` | 获取当前用户全部笔记 |
| GET | `/note/roots` | 获取根级笔记 |
| GET | `/note/children` | 获取子笔记。query: `parentId` |
| GET | `/note/ancestors` | 获取祖先链。query: `noteId` |
| GET | `/note/detail` | 获取笔记详情。query: `noteId` |
| GET | `/note/recent` | 最近修改的笔记。query: `limit?` |
| GET | `/note/getNote` | 按用户获取笔记 |
| POST | `/note/search` | 搜索笔记。body: `{ keyword, userId? }` |

### 删除
| 方法 | 路径 | 说明 |
|------|------|------|
| DELETE | `/note/delete` | 删除笔记（递归删子笔记）。query: `noteId` |

---

## 客户端页面

### 笔记编辑器 `/note/:Id`

**核心文件**:
- `client/src/views/note/index.tsx` — 主页面，组装编辑器布局
- `client/src/views/note/NoteBreadcrumb.tsx` — 面包屑导航（祖先链）
- `client/src/views/note/NoteMeta.tsx` — 元数据编辑面板（状态/标签/日期/封面）
- `client/src/views/note/NoteCard.tsx` — 笔记卡片
- `client/src/views/note/Select/` — 选择器组件

**使用组件**:
- `component/editor/Tiptap/` — 富文本编辑器
- `component/Header.tsx` — 顶部栏
- `component/UI/Dialog/` — 弹窗

### 笔记库 `/note-lib`

**核心文件**:
- `client/src/views/NoteLibrary.tsx` — 主页面
- `client/src/features/note/components/` — 专用组件
- `client/src/features/note/hooks/` — 业务 hooks

**功能**:
- 表格/列表视图切换
- 搜索、排序、批量操作（删除/移动）
- Markdown 导入
- 新建笔记入口

---

## 可复用组件

| 组件 | 路径 | 用途 |
|------|------|------|
| TiptapEditor | `component/editor/Tiptap/` | 富文本编辑器，支持 markdown 快捷键、代码块、表格、图片上传 |
| NoteTree | `component/SideBar/NoteMenu/` | 侧边栏笔记树 |
| Tree | `component/SideBar/components/Tree` | 通用树形组件（可拖拽、展开/折叠） |

---

## 状态管理 (Jotai Atoms)

| Atom | 用途 |
|------|------|
| `rootNotesAtom(owner)` | 根笔记列表 |
| `allNotesAtom(owner)` | 全部笔记 |
| `noteChildrenAtom(noteId)` | 子笔记列表 |
| `noteDetailAtom(noteId)` | 笔记详情 |
| `noteAncestorsAtom(noteId)` | 祖先链 |
| `recentNoteAtom` | 最近笔记 |
| `createNoteAtom` | 创建笔记 mutation |
| `updateNoteContentAtom` | 更新内容 mutation |
| `updateNotePropertiesAtom` | 更新属性 mutation |

---

## 如何开发新功能

### 添加新 API
1. 在 `server/app/controller/note/` 添加处理函数
2. 在 `server/app/routes/note.ts` 注册路由
3. 在 `client/src/api/note.ts` 添加前端调用函数

### 添加新页面组件
1. 在 `client/src/views/note/` 添加组件
2. 如需全局状态，在 `client/src/store/atom/noteAtom.ts` 添加 atom

### 添加笔记属性
1. 修改 `server/app/models/note.ts` 的 schema
2. 更新 `server/app/routes/note.ts` 的 zod 验证
3. 更新 `client/src/api/note.ts` 的类型定义

---

## 依赖关系

- 依赖 **auth** 模块（所有操作需认证）
- 依赖 **image** 模块（笔记内图片上传到 GitHub 图床）
- 依赖 **summary** 模块（笔记摘要，通过 noteId 关联）
- 侧边栏 NoteTree 依赖本模块的 API

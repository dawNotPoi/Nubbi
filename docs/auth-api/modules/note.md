# Note 模块接口

## 类型速览

```ts
type SuccessEnvelope<T> = {
  code: 1;
  message: string;
  data: T;
};

type NoteDocument = {
  _id: string;
  userId: string;
  title: string;
  content: string;
  watched: number;
  like: number;
  password: string | null;
  cover: string;
  children: string[];
  parentId: string | null;
  date: string | Date;
  meta: Record<string, unknown>;
  createdAt: string | Date;
  updatedAt: string | Date;
};

type NoteSummary = Omit<NoteDocument, "content">;

type SearchNoteResult = NoteDocument & {
  pathLabel: string;
};
```

### `POST /note/create`

- 鉴权要求：需要登录
- 源码：[server/app/routes/note.ts](/e:/Code/D-NOTE/server/app/routes/note.ts)
- 作用：创建笔记，并把当前登录用户写入 `userId`

请求参数：

```ts
type Body = {
  title: string;
  content?: string;
  parentId?: string;
  meta?: Record<string, unknown>;
};
```

成功响应：

```ts
type Response = SuccessEnvelope<NoteDocument>;
```

常见错误：

- `401` 未登录
- `400` 请求体不满足 zod 校验
- `500` 数据库存储失败

后端流程图：

```mermaid
flowchart TD
  A([收到请求]) --> B[requireAuth]
  B --> C{存在 session.user?}
  C -- 否 --> Z([返回 401])
  C -- 是 --> D[zod 校验 body]
  D --> E[getUser(req)]
  E --> F[createNote 写入 userId]
  F --> G([successResponse 返回笔记])
```

### `PUT /note/content`

- 鉴权要求：需要登录
- 源码：[server/app/routes/note.ts](/e:/Code/D-NOTE/server/app/routes/note.ts)
- 作用：更新笔记正文内容

请求参数：

```ts
type Body = {
  noteId: string;
  content: string;
};
```

成功响应：

```ts
type Response = SuccessEnvelope<NoteDocument | null>;
```

常见错误：

- `401` 未登录
- `400` `noteId` 或 `content` 缺失
- `401` 笔记归属校验失败

备注：

- 当前实现里 `validateNoteUser()` 是异步函数，但调用处没有 `await`，这是一个权限风险点。

后端流程图：

```mermaid
flowchart TD
  A([收到请求]) --> B[requireAuth]
  B --> C{已登录?}
  C -- 否 --> Z([返回 401])
  C -- 是 --> D[校验 noteId 和 content]
  D --> E{validateNoteUser}
  E -- 否 --> Y([返回 Unauthorized])
  E -- 是 --> F[updateNoteContent]
  F --> G([successResponse 返回更新结果])
```

### `PUT /note/properties`

- 鉴权要求：需要登录
- 源码：[server/app/routes/note.ts](/e:/Code/D-NOTE/server/app/routes/note.ts)
- 作用：更新笔记元信息，如 `parentId`、`meta`、`cover`

请求参数：

```ts
type Body = {
  noteId: string;
  parentId?: string;
  meta?: Record<string, unknown>;
  cover?: string;
};
```

成功响应：

```ts
type Response = SuccessEnvelope<NoteDocument | null>;
```

常见错误：

- `401` 未登录
- `400` `noteId` 缺失
- `401` 笔记归属校验失败

备注：

- 这里同样存在 `validateNoteUser()` 未 `await` 的风险。

后端流程图：

```mermaid
flowchart TD
  A([收到请求]) --> B[requireAuth]
  B --> C{已登录?}
  C -- 否 --> Z([返回 401])
  C -- 是 --> D[校验 body]
  D --> E{validateNoteUser}
  E -- 否 --> Y([返回 Unauthorized])
  E -- 是 --> F[updateNoteMeta]
  F --> G([successResponse 返回更新结果])
```

### `GET /note/roots`

- 鉴权要求：公开
- 源码：[server/app/routes/note.ts](/e:/Code/D-NOTE/server/app/routes/note.ts)
- 作用：根据 `owner` 查询根节点笔记

请求参数：

```ts
type Query = {
  owner: string;
};
```

成功响应：

```ts
type Response = SuccessEnvelope<NoteSummary[]>;
```

常见错误：

- `400` 缺少 `owner`
- `500` 查询失败

后端流程图：

```mermaid
flowchart TD
  A([收到请求]) --> B[读取 query.owner]
  B --> C{owner 存在?}
  C -- 否 --> Z([返回 400])
  C -- 是 --> D[getRootNotes(owner)]
  D --> E([successResponse 返回列表])
```

### `GET /note/children`

- 鉴权要求：需要登录
- 源码：[server/app/routes/note.ts](/e:/Code/D-NOTE/server/app/routes/note.ts)
- 作用：查询某个父笔记的直接子笔记

请求参数：

```ts
type Query = {
  parentId: string;
};
```

成功响应：

```ts
type Response = SuccessEnvelope<NoteSummary[]>;
```

常见错误：

- `401` 未登录
- `400` 缺少 `parentId`

后端流程图：

```mermaid
flowchart TD
  A([收到请求]) --> B[requireAuth]
  B --> C{已登录?}
  C -- 否 --> Z([返回 401])
  C -- 是 --> D[校验 query.parentId]
  D --> E[getDirectChildren(parentId)]
  E --> F([successResponse 返回列表])
```

### `GET /note/detail`

- 鉴权要求：需要登录
- 源码：[server/app/routes/note.ts](/e:/Code/D-NOTE/server/app/routes/note.ts)
- 作用：查询单篇笔记详情

请求参数：

```ts
type Query = {
  noteId: string;
};
```

成功响应：

```ts
type Response = SuccessEnvelope<NoteDocument | null>;
```

常见错误：

- `401` 未登录
- `400` 缺少 `noteId`

后端流程图：

```mermaid
flowchart TD
  A([收到请求]) --> B[requireAuth]
  B --> C{已登录?}
  C -- 否 --> Z([返回 401])
  C -- 是 --> D[校验 query.noteId]
  D --> E[getNoteById(noteId)]
  E --> F([successResponse 返回详情])
```

### `DELETE /note/delete`

- 鉴权要求：需要登录
- 源码：[server/app/routes/note.ts](/e:/Code/D-NOTE/server/app/routes/note.ts)
- 作用：递归删除笔记及其子笔记

请求参数：

```ts
type Body = {
  noteId: string;
};
```

成功响应：

```ts
type Response = SuccessEnvelope<null>;
```

常见错误：

- `401` 未登录
- `400` 缺少 `noteId`
- `401` 笔记归属校验失败

备注：

- 这里也依赖 `validateNoteUser()`，当前调用没有 `await`。

后端流程图：

```mermaid
flowchart TD
  A([收到请求]) --> B[requireAuth]
  B --> C{已登录?}
  C -- 否 --> Z([返回 401])
  C -- 是 --> D[校验 noteId]
  D --> E{validateNoteUser}
  E -- 否 --> Y([返回 Unauthorized])
  E -- 是 --> F[deleteNote 递归删除]
  F --> G([successResponse 返回 null])
```

### `GET /note/getNote`

- 鉴权要求：公开
- 源码：[server/app/routes/note.ts](/e:/Code/D-NOTE/server/app/routes/note.ts)
- 作用：根据 `userId` 查询叶子笔记列表

请求参数：

```ts
type Query = {
  userId: string;
};
```

成功响应：

```ts
type Response = SuccessEnvelope<NoteDocument[]>;
```

常见错误：

- `400` 缺少 `userId`
- `500` 查询失败

后端流程图：

```mermaid
flowchart TD
  A([收到请求]) --> B[读取 query.userId]
  B --> C{userId 存在?}
  C -- 否 --> Z([返回 400])
  C -- 是 --> D[getNotes(userId)]
  D --> E([successResponse 返回列表])
```

### `GET /note/recent`

- 鉴权要求：需要登录
- 源码：[server/app/routes/note.ts](/e:/Code/D-NOTE/server/app/routes/note.ts)
- 作用：查询当前用户最近更新的叶子笔记

请求参数：

```ts
type Query = {};
```

成功响应：

```ts
type Response = SuccessEnvelope<NoteDocument[]>;
```

常见错误：

- `401` 未登录
- `500` 查询失败

后端流程图：

```mermaid
flowchart TD
  A([收到请求]) --> B[requireAuth]
  B --> C{已登录?}
  C -- 否 --> Z([返回 401])
  C -- 是 --> D[getUser(req)]
  D --> E[getRecentNotes(owner.id)]
  E --> F([successResponse 返回列表])
```

### `POST /note/search`

- 鉴权要求：需要登录
- 源码：[server/app/routes/note.ts](/e:/Code/D-NOTE/server/app/routes/note.ts)
- 作用：按标题模糊搜索当前用户笔记，并补充 `pathLabel`

请求参数：

```ts
type Body = {
  title: string;
};
```

成功响应：

```ts
type Response = SuccessEnvelope<SearchNoteResult[]>;
```

常见错误：

- `401` 未登录
- `500` 搜索失败

后端流程图：

```mermaid
flowchart TD
  A([收到请求]) --> B[requireAuth]
  B --> C{已登录?}
  C -- 否 --> Z([返回 401])
  C -- 是 --> D[getUser(req)]
  D --> E[searchNotes(owner.id, title)]
  E --> F[为结果构造 pathLabel]
  F --> G([successResponse 返回结果])
```

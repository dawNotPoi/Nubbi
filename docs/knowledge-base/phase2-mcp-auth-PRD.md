# Phase 2：MCP Server + Token 鉴权 PRD

## 模块概述

新增独立的 MCP HTTP 服务（Docker），提供标准化的 agent 工具接口来管理 note。Token 基于 SHA-256 hash 存储，支持文件夹级别的细粒度权限控制。Web UI 提供 Token 管理面板。

**模块名**：`knowledge-base`（新模块，部分代码落在 `mcp/`、`server/`、`client/`）

---

## 背景

### 现状问题

- agent 只能通过人类用的 HTTP API 操作 note，没有标准化工具接口
- 没有 agent 专用的鉴权机制，无法控制 agent 能访问哪些笔记
- 未来外部设备（如手机上的 Claude）需要通过 agent 管理笔记，需要一个安全的 token 体系

### 设计原则

1. **最小权限**：每个 Token 限定操作类型（读/写/删）和文件夹范围
2. **安全优先**：Token 原始值只在创建时返回一次，数据库只存 hash
3. **职责分离**：MCP 是独立服务，不耦合到主 server，互相影响最小
4. **可审计**：记录 lastUsedAt，用户可追踪每个 Token 的使用情况

---

## 架构总览

```
┌─────────────────────────────────────────────────────┐
│                    Docker Host                        │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐ │
│  │ Client   │  │ Server   │  │ MCP     │  │ Qdrant │ │
│  │ :80      │  │ :4000    │  │ :3100   │  │ :6333  │ │
│  │ (React)  │  │(Express) │  │ (HTTP)  │  │ (P3)   │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┘ │
│       │             │             │                   │
│       │    HTTP     │  内部调用    │                   │
│       ├────────────►├◄────────────┤                   │
│       │             │             │                   │
│       ▼             ▼             ▼                   │
│              ┌─────────────┐                          │
│              │  MongoDB     │                          │
│              │  (共享连接)   │                          │
│              └─────────────┘                          │
└─────────────────────────────────────────────────────┘
```

**关键设计**：
- MCP Server 是独立的 Node.js 进程，与主 server 不共享内存，只共享 MongoDB
- MCP 通过内部 HTTP 调用主 server 的 Express API 来操作 note
- MCP 不直接操作 note 数据模型，所有 note 操作都经过主 server 的鉴权+业务逻辑

---

## Docker 服务新增

### `docker-compose.yml` 新增

```yaml
mcp:
  build:
    context: ./mcp
  env_file:
    - ./mcp/.env
  ports:
    - "${MCP_PORT:-3100}:3100/tcp"
  restart: unless-stopped
  depends_on:
    - server
```

### MCP 服务结构

```
mcp/
├── Dockerfile
├── package.json
├── tsconfig.json
├── .env
├── .env.example
└── src/
    ├── index.ts              # HTTP server 入口，注册 MCP + SSE transport
    ├── server.ts             # Express 实例，mount MCP
    ├── auth.ts               # Token 鉴权中间件
    ├── noteClient.ts         # 封装调用 server API 的 HTTP client
    ├── tools/
    │   ├── index.ts          # 注册所有 tool
    │   ├── list-notes.ts
    │   ├── get-note.ts
    │   ├── create-note.ts
    │   ├── update-note.ts
    │   ├── move-note.ts
    │   ├── search-notes.ts
    │   └── ask-kb.ts         # Phase 3 激活，此时为空实现
    └── types.ts              # 共享类型
```

---

## Token 数据模型

### MongoDB Model（`server/app/models/mcpToken.ts`）

```ts
import mongoose from "@/lib/db";

const mcpTokenSchema = new mongoose.Schema(
  {
    // 归属用户
    userId: {
      type: String,
      required: true,
      index: true,
    },
    // 用途描述
    label: {
      type: String,
      required: true,
      maxlength: 100,
    },
    // SHA-256(原始 token)
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    // 过期时间（null = 永不过期）
    expiresAt: {
      type: Date,
      default: null,
    },
    // 权限范围
    scope: {
      folderIds: {
        type: [String],
        default: [],
        // [] = 全库不可读写（需明确配置）
        // ["*"] = 全库
        // ["folderId1", "folderId2"] = 指定文件夹
      },
      operations: {
        type: [String],
        enum: ['read', 'write', 'delete'],
        default: ['read'],
      },
    },
    // 最近使用时间
    lastUsedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("MCPToken", mcpTokenSchema);
```

### Token 生命周期

```
用户创建 Token
  → 服务端生成 crypto.randomBytes(32).toString('hex')
  → SHA-256 hash 存入 tokenHash
  → 原始 token 仅返回一次，格式: nubbi_mcp_<32hex>
  → 用户复制后无法再次查看（类似 GitHub PAT）
      ↓
每次 MCP 请求
  → 从 Authorization header 提取 token
  → SHA-256 → 查 MCPToken
  → 检查 expiresAt、scope
  → 更新 lastUsedAt
      ↓
用户撤销 Token
  → 删除文档，立即失效
  → 或者 Token 过期自动失效
```

---

## Token 管理 API

挂在主 server 下（`server/app/routes/mcpToken.ts`），所有端点需要用户登录（通过 existing auth middleware）。

### `POST /mcp-token/create`

创建新的 MCP 访问令牌。

**请求**（需登录）：
```json
{
  "label": "Claude Desktop 本地",
  "expiresInDays": 30,
  "scope": {
    "folderIds": ["*"],
    "operations": ["read", "write"]
  }
}
```

**响应**（只返回一次原始 token）：
```json
{
  "id": "...",
  "label": "Claude Desktop 本地",
  "token": "nubci_mcp_a1b2c3d4e5f6...",
  "expiresAt": "2026-07-14T00:00:00Z",
  "scope": {
    "folderIds": ["*"],
    "operations": ["read", "write"]
  },
  "createdAt": "2026-06-14T12:00:00Z"
}
```

**校验**：
- `label`：1-100 字符
- `expiresInDays`：1-365，默认 30
- `scope.operations`：至少包含一个

### `GET /mcp-token/list`

列出当前用户所有 Token（不含原始 token）。

**响应**：
```json
[
  {
    "id": "...",
    "label": "Claude Desktop 本地",
    "expiresAt": "2026-07-14T00:00:00Z",
    "isExpired": false,
    "scope": { "folderIds": ["*"], "operations": ["read", "write"] },
    "lastUsedAt": "2026-06-14T14:30:00Z",
    "createdAt": "2026-06-14T12:00:00Z"
  }
]
```

### `DELETE /mcp-token/:id`

撤销指定 Token。限本人。

**响应**：`{ "deleted": true }`

---

## MCP Server 实现

### 依赖

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.x",
    "express": "^4.x",
    "crypto": "内置",
    "zod": "^3.x"
  }
}
```

**关键决策**：使用 `@modelcontextprotocol/sdk` 的 `StreamableHTTPServerTransport`，支持 HTTP transport 模式（因为用户选择独立端口而非 stdio）。

### MCP Tool 定义

#### `list_notes`

列出笔记，支持按文件夹、类型、标签过滤。

```ts
// 输入
{
  parentId?: string;     // 父笔记 ID（null = 根级）
  type?: NoteType;       // 过滤类型
  tag?: string;          // 过滤标签
  keyword?: string;      // 搜索关键词
  limit?: number;        // 返回数量，默认 20，最大 100
  offset?: number;       // 分页偏移，默认 0
}

// 输出
{
  notes: [{
    id: string;
    title: string;
    type: NoteType;
    tags: string[];
    hasChildren: boolean;
    updatedAt: string;
  }];
  total: number;
  hasMore: boolean;
}
```

#### `get_note`

读取单个笔记的完整内容和元数据。

```ts
// 输入
{ noteId: string }

// 输出
{
  id: string;
  title: string;
  content: string;        // 完整内容
  type: NoteType;
  meta: Record<string, any>;
  parentId: string | null;
  children: string[];     // 子笔记 ID 列表
  ancestors: [{ id: string; title: string }];  // 祖先链
  createdAt: string;
  updatedAt: string;
}
```

#### `create_note`

新建笔记。权限要求：scope 含 `write` + target folder 在授权范围内。

```ts
// 输入
{
  title: string;
  content?: string;
  parentId?: string;      // 目标文件夹
  type?: NoteType;
  meta?: Record<string, any>;
}

// 输出
{ id: string; title: string; }
```

#### `update_note`

更新笔记内容或元数据。

```ts
// 输入
{
  noteId: string;
  title?: string;
  content?: string;
  meta?: Record<string, any>;  // 部分更新，仅传要改的 key
}

// 输出
{ id: string; updatedAt: string; }
```

#### `move_note`

移动笔记到其他文件夹。

```ts
// 输入
{
  noteId: string;
  targetParentId: string;  // 目标文件夹 ID（null = 移到根级）
}

// 输出
{ id: string; oldParentId: string | null; newParentId: string | null; }
```

**权限**：需要原位置和目标位置都在 scope.folderIds 内。

#### `search_notes`

全文搜索笔记。

```ts
// 输入
{
  keyword: string;
  type?: NoteType;
  tag?: string;
  scope?: 'user' | 'all';  // 默认 'user'（仅自己的笔记）
}

// 输出
{
  results: [{
    id: string;
    title: string;
    excerpt: string;       // 匹配片段
    type: NoteType;
    path: string[];        // 祖先路径
  }];
  total: number;
}
```

#### `ask_kb`（Phase 3 激活，当前返回未实现）

```ts
// 输入
{
  question: string;
  scopeFolderId?: string;  // 限制搜索范围到特定文件夹
}

// 输出（Phase 3 后有效）
{
  answer: string;
  sources: [{ noteId: string; title: string; excerpt: string; path: string[] }];
  confidence: 'high' | 'medium' | 'low';
  hasRelevantContent: boolean;
}
```

---

## 权限校验逻辑

### 鉴权中间件（`mcp/src/auth.ts`）

```ts
async function authenticateMCP(req: Request): Promise<{
  userId: string;
  scope: MCPTokenScope;
}> {
  // 1. 提取 header
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new MCPError(401, 'Missing or invalid Authorization header');
  }

  const token = authHeader.slice(7);
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  // 2. 查数据库
  const tokenDoc = await MCPToken.findOne({ tokenHash });
  if (!tokenDoc) {
    throw new MCPError(401, 'Invalid token');
  }

  // 3. 检查过期
  if (tokenDoc.expiresAt && tokenDoc.expiresAt < new Date()) {
    throw new MCPError(401, 'Token expired');
  }

  // 4. 更新 lastUsedAt（异步，不阻塞）
  MCPToken.updateOne(
    { _id: tokenDoc._id },
    { $set: { lastUsedAt: new Date() } }
  ).catch(() => {});

  return { userId: tokenDoc.userId, scope: tokenDoc.scope };
}
```

### 操作权限检查

```ts
function checkPermission(
  scope: MCPTokenScope,
  operation: 'read' | 'write' | 'delete',
  folderIds: string[]  // 受影响的文件夹 ID
): void {
  // 1. 检查操作类型
  if (!scope.operations.includes(operation)) {
    throw new MCPError(403, `Token 不允许 ${operation} 操作`);
  }

  // 2. ["*"] = 全库
  if (scope.folderIds.includes('*')) return;

  // 3. [] = 什么都不能操作（除 read 个人笔记外）
  if (scope.folderIds.length === 0) {
    throw new MCPError(403, 'Token 未授权任何文件夹');
  }

  // 4. 检查每个 folder 是否在授权范围内
  for (const fid of folderIds) {
    if (!scope.folderIds.includes(fid)) {
      throw new MCPError(403, `Token 未授权文件夹 ${fid}`);
    }
  }
}
```

---

## 客户端 Token 管理 UI

### 位置

设置页面新增 Tab：「MCP 访问令牌」

### 功能

1. **Token 列表**：表格显示 label、scope 摘要、过期时间、最近使用时间、状态（活跃/已过期）
2. **创建 Token**：
   - 弹窗表单：label（必填）、过期天数（默认 30）、操作权限（复选 read/write/delete）、文件夹范围（选择器）
   - 创建成功后弹窗展示原始 token，附带「已复制」按钮和警告：「此 token 仅显示一次，请立即保存」
3. **撤销 Token**：确认弹窗后删除

### 组件文件

```
client/src/views/settings/
  MCPTokenPanel.tsx         # 主面板
  CreateTokenModal.tsx      # 创建弹窗
  TokenList.tsx            # Token 列表
```

### 路由

`/settings?tab=mcp-tokens`

---

## 配置

### MCP Server `.env`

```env
# 服务端口
MCP_PORT=3100

# 调用主 server 的内部地址
SERVER_INTERNAL_URL=http://server:4000

# MongoDB（与 server 共享）
MONGODB_URI=mongodb://mongo:27017/nubbi
```

---

## 安全考虑

1. **Token 传输**：MCP server 不直接暴露公网，由 nginx/client 的反代或本地 localhost 访问
2. **Hash 算法**：SHA-256，不可逆
3. **Rate Limit**：将来可在 nginx 层加 `limit_req`
4. **唯一返回**：创建后 token 明文不在任何地方存储或日志输出
5. **有效期强制**：建议默认 30 天，最长不超过 365 天

---

## 实施顺序

1. **MCP 项目骨架**：`mcp/` 目录 + package.json + tsconfig + Dockerfile
2. **Token Model**：`server/app/models/mcpToken.ts`
3. **Token API**：`server/app/routes/mcpToken.ts`（CRUD）
4. **MCP 鉴权**：`mcp/src/auth.ts`
5. **MCP Note Client**：`mcp/src/noteClient.ts`（封装对 server API 的调用）
6. **MCP Tools**：逐个实现 list/get/create/update/move/search
7. **MCP 入口**：`mcp/src/index.ts`，注册 transport + tools
8. **docker-compose**：新增 mcp 服务
9. **客户端 UI**：`MCPTokenPanel.tsx` + 创建弹窗
10. **客户端路由**：设置页新增 Tab

---

## 验收标准

- [ ] `POST /mcp-token/create` 创建成功，返回原始 token（仅一次）
- [ ] `GET /mcp-token/list` 列出当前用户的 Token（不含原始值）
- [ ] `DELETE /mcp-token/:id` 撤销后 token 立即不可用
- [ ] MCP Server 启动后 `GET /` 返回正常
- [ ] 无 token / 错误 token / 过期 token 均返回 401
- [ ] `list_notes` 返回当前用户笔记，过滤功能正常
- [ ] `get_note` 返回完整笔记内容和祖先链
- [ ] `create_note` 创建笔记并返回 ID
- [ ] `update_note` 部分更新 meta（不传的 key 不覆盖）
- [ ] `move_note` 移动后父子关系正确
- [ ] `search_notes` 全文搜索返回匹配结果
- [ ] 文件夹级权限生效：超出范围拒绝 +403
- [ ] 操作权限生效：无 write 权限时 create/update 拒绝
- [ ] Web UI 可管理 Token（创建/查看/撤销）
- [ ] Token 过期后自动失效

---

## 依赖关系

- 依赖 **Phase 1**（meta 结构化，MCP tool 的输入/输出依赖结构化 meta）
- 依赖 **auth** 模块（Token 管理 API 需用户登录）
- 依赖 **note** 模块（MCP 通过 note API 操作笔记）
- 被 **Phase 3**（`ask_kb` tool 激活）、**Phase 4**（`ingest_url` tool）依赖

---

## 估时

**1.5 周**（约 7–8 个工作日）

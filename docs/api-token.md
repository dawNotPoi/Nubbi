# 长期 API Token 使用说明

长期 API Token 用于外部程序（博客、MCP server 等）以某个用户的身份调用业务接口，无需浏览器登录态。

## 生成 Token

1. 登录 Nubbi，点击左上角**个人头像 → 鉴权管理**；
2. 选择用途「通用 API」或「MCP Agent」，输入名称并选择有效期，点击**生成 Token**；
3. **立即复制保存明文 Token**（`nb_` 开头）——服务端只存哈希，关闭弹窗后无法再次查看；
4. 泄露或不再使用时，在同一界面删除该 Token，删除**立即生效**。

## 调用方式

请求头携带 `x-api-key`：

```bash
curl https://<服务端地址>/note/all -H "x-api-key: nb_xxxxxxxx..."
```

- Token 等同于该用户的账号凭证，请保管在服务端环境变量或密钥管理中，**不要**写进前端代码或提交到仓库。
- 限流：每个 Token **300 次/分钟**，超出后返回错误，窗口重置后恢复。
- 401 统一返回 `{"code":0,"message":"Unauthorized"}`，不区分无效/过期/已删除；收到 401 应提示用户重新生成 Token。

## 可用接口范围

数据始终按 Token 所属用户隔离。通用 API Token 保持现有业务访问能力；MCP Agent Token 固定为：

- 可读取全部本人笔记；
- 只可创建或修改 `source=agent` 的笔记；
- 可移动、归档、移入回收站和恢复 Agent 笔记；
- 不可发布、永久删除，也不可访问文件或会议接口。

历史无 permissions 的 Token 按通用 API Token 兼容处理。

MCP Agent Token 对旧 `/note/*` 仅保留读取能力；创建、编辑、移动、归档、回收和恢复必须经 `/mcp-api/*`，旧写路由统一返回 403。

| 前缀 | 说明 |
|---|---|
| `/note/*` | 笔记查询与 CRUD |
| `/tag/*` | 标签管理 |
| `/file/*` | 文件管理 |
| `/meeting/*` | 会议 |

**不可访问**：`/auth/*`（注销账号、改密码等敏感操作）与 `/api/auth/*`（含创建新 Token）——这些始终要求真实登录态，Token 无法用自己创建新 Token。

统一响应格式：`{"code": 1, "message": "...", "data": ...}`，`code === 0` 表示失败。

### 博客场景常用接口

| 接口 | 说明 |
|---|---|
| `GET /note/all` | 该用户全部未删除笔记（不含正文） |
| `GET /note/roots` | 顶层笔记 |
| `GET /note/children?parentId=<id>` | 直接子节点 |
| `GET /note/detail?noteId=<id>` | 单条详情（含正文） |
| `GET /note/recent` | 最近更新 |
| `POST /note/search` | 搜索 |

博客侧示例：

```ts
const res = await fetch(`${API_BASE}/note/all`, {
  headers: { "x-api-key": process.env.NUBBI_API_TOKEN! },
});
const { code, data, message } = await res.json();
if (res.status === 401) throw new Error("Token 无效或已过期，请重新生成");
if (code === 0) throw new Error(message);
```

### MCP server 对接注意

- stdio 通过环境变量 `NUBBI_API_KEY` 注入 Token；远程 HTTP 在每次请求使用 `Authorization: Bearer <token>`；
- MCP Server 将 Token 转发给主服务 `/mcp-api/*`，不要把 Token 放入提示词或 Tool 参数；
- 同一 MCP Token 可用于 stdio 和 HTTP，但建议每个部署单独创建，以便独立撤销和审计；
- 收到 401 时向用户提示「请在 Nubbi 的鉴权管理中重新生成 Token」，不要静默重试；
- 注意 300 次/分钟的限流，批量操作时控制并发。

## 实现说明（服务端）

- 基于 better-auth 的 `apiKey` 插件（`server/app/lib/auth.ts`），key 以 SHA-256 哈希存储在 `apikey` 集合；
- 校验入口为 `requireAuthWithApiKey` 中间件（`server/app/middleware/session.ts`）：请求带 `x-api-key` 时走 `auth.api.verifyApiKey`，否则回落到原有 session/JWT 逻辑；
- 已显式关闭插件的 `sessions from api keys` 行为（`disableSessionForAPIKeys: true`），Token 无法触达 better-auth 自身端点。
- 认证前置守卫拒绝外部 `/api-key/create`、`/api-key/update` 请求中的 `userId` 服务端字段，避免客户端伪造 Token 所属用户或注入 server-only permissions。

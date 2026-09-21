# Phase 2：Note MCP + Scoped Token PRD

## 目标

为 Nubbi 提供独立的 MCP Server，使 Agent 能读取、创建、编辑、移动、归档和回收笔记，同时复用现有 Better Auth API Key，并在服务端强制最小权限。

首版同时支持：

- 本地 Agent 通过 stdio 启动 MCP 子进程；
- 云端或移动 Agent 通过私有 Streamable HTTP 连接；
- 用户在现有「鉴权管理」中创建固定权限的 MCP Agent Token；
- 人类通过回收站页面恢复或永久删除笔记。

## 已确认决策

1. Token 继续使用 Better Auth `apikey` 集合、`nb_` 前缀、哈希存储、过期、限流和撤销机制，不新增 Token Model。
2. 现有弹窗增加「通用 API / MCP Agent」用途预设，不做细粒度权限勾选。
3. MCP 可读取当前用户全部笔记；只能修改 `source=agent` 的笔记。
4. MCP 创建笔记时强制 `source=agent`、`status=inbox`、`published=false`。
5. MCP 支持移动、归档、移入回收站和恢复；不支持发布或永久删除。
6. 永久删除只通过人类回收站 UI 执行。
7. 同一 MCP Token 可用于 stdio 和 HTTP，但文档建议每个部署单独创建。
8. 首版远程服务使用 HTTPS + Bearer Token，OAuth 2.1 留待公开第三方接入阶段。

## 架构

流程图见 `docs/knowledge-base/mcp-note-flow.excalidraw`。

```text
Local MCP Host --stdio/env token-->
                                  Nubbi MCP --x-api-key--> Nubbi Server --> MongoDB
Remote MCP Host --HTTPS/Bearer---->
```

- `mcp/` 是独立 TypeScript workspace，不直接连接 MongoDB。
- MCP 所有 Note 操作经主服务 `/mcp-api/*`，复用 Note Controller/Model 业务规则。
- 普通 `/note/*` 拒绝 MCP Token 的读写请求；MCP 必须走受约束的 `/mcp-api/*`，不能通过旧路由绕过 Agent 子树与字段策略。

## Token 权限

MCP Agent Token 固定写入：

```json
{
  "metadata": { "kind": "mcp", "policyVersion": 1 },
  "permissions": {
    "note": ["read", "create", "update", "move", "archive", "trash", "restore"]
  }
}
```

权限规则：

| 场景 | 结果 |
| --- | --- |
| 读取本人 `user/agent` 笔记 | 允许 |
| 创建笔记 | 允许，服务端强制 Agent 来源 |
| 修改/移动/归档/删除普通用户笔记 | 403 |
| 修改 `source`、`published`、`deletedAt` | 403 |
| 发布、永久删除、文件、会议接口 | 403 |
| Agent 父笔记含普通用户后代时移动/删除/恢复 | 409，不做部分修改 |
| 访问其他用户数据 | 404 |

无 permissions 的历史 Token 继续按通用 Token 处理，避免破坏现有博客或集成。

## 主服务 MCP API

所有接口只接受 MCP Agent API Key：

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET | `/mcp-api/context` | 校验 Token 并返回 capability |
| GET | `/mcp-api/notes` | 分页列出笔记 |
| GET | `/mcp-api/notes/search` | 搜索标题、正文和标签 |
| GET | `/mcp-api/notes/:noteId` | 读取详情或正文分段 |
| POST | `/mcp-api/notes` | 创建 Agent 笔记 |
| PATCH | `/mcp-api/notes/:noteId/content` | 安全编辑 Markdown |
| PATCH | `/mcp-api/notes/:noteId/properties` | 修改标题、标签和 meta |
| POST | `/mcp-api/notes/:noteId/move` | 移动 Agent 笔记 |
| POST | `/mcp-api/notes/:noteId/archive` | 归档/取消归档 |
| POST | `/mcp-api/notes/:noteId/trash` | 软删除纯 Agent 子树 |
| GET | `/mcp-api/trash` | 分页读取回收站 |
| POST | `/mcp-api/notes/:noteId/restore` | 恢复纯 Agent 子树 |

列表默认 20、最大 50，返回 `total/count/offset/hasMore/nextOffset`。正文默认每段 20,000 字符，响应总长度限制 25,000 字符。

正文编辑支持 `replace`、`append`、`prepend`、`replace_text`，必须携带 `baseContentRevision`。属性、移动和归档携带 `expectedUpdatedAt`。冲突返回 409 和最新版本提示。

## MCP Tools

| Tool | 行为 |
| --- | --- |
| `nubbi_list_notes` | 分页列出元数据 |
| `nubbi_search_notes` | 搜索并返回摘要与路径 |
| `nubbi_get_note` | 获取 Markdown、meta、路径和 revision |
| `nubbi_create_note` | 创建 Agent inbox 笔记 |
| `nubbi_edit_note_content` | 安全修改正文 |
| `nubbi_update_note_properties` | 局部更新属性 |
| `nubbi_move_note` | 移动 Agent 笔记 |
| `nubbi_archive_note` | 归档或取消归档 |
| `nubbi_trash_note` | 移入回收站 |
| `nubbi_list_trash` | 列出回收站 |
| `nubbi_restore_note` | 恢复 Agent 笔记 |

每个 Tool 使用严格 Zod Schema、完整 annotations、结构化输出和可执行错误说明。只读工具可安全重试，写工具不自动重试。

同一用户的创建、移动、回收、恢复和永久删除共享 Mongo 租约锁，跨进程串行结构变更，避免并发双向移动形成环或在已删除父节点下创建活跃子节点。正文使用 revision CAS，属性、移动、归档及带时间戳的回收使用原子条件更新。

## Transport 与配置

### stdio

```env
NUBBI_API_URL=http://localhost:4000
NUBBI_API_KEY=nb_xxx
MCP_TRANSPORT=stdio
```

stdout 仅用于 JSON-RPC，日志写入 stderr。

### Streamable HTTP

```env
NUBBI_API_URL=http://server:4000
MCP_TRANSPORT=http
MCP_HOST=0.0.0.0
MCP_PORT=3100
MCP_ALLOWED_HOSTS=mcp.example.com
MCP_ALLOWED_ORIGINS=https://example.com
```

- `/mcp` 每次请求必须携带 `Authorization: Bearer nb_xxx`；
- `/health` 不返回用户或 Token 信息；
- Host/Origin 不在白名单时返回 403；
- 公网入口必须由反向代理终止 HTTPS。

## 回收站 UI

- 新增 `/note-trash` 与侧边栏入口；
- 树形展示标题、删除时间、来源和状态；
- 支持搜索、来源筛选、单项/批量恢复与永久删除；
- 客户端按 500 项分页读取完整回收站，再计算树层级和父级恢复约束；
- 父节点仍在回收站时，禁止单独恢复子节点；
- 永久删除必须二次确认，并按顶层选中项处理级联；
- 不做自动清理、定时任务或已删除正文预览。

## 验收标准

- stdio 与 Streamable HTTP 均可列出并调用同一组 Tools；
- MCP Token 可读取全部本人笔记，但只能写 Agent 笔记；
- 不能通过旧 Note API 绕过 source、publish 或 purge 限制；
- 不能通过 Better Auth 原生 API Key 端点伪造 `userId` 创建或提权 Token；
- revision 冲突不会覆盖新内容；
- 回收站可完整执行软删除、列表、恢复和人类永久删除；
- MCP 构建、服务端 typecheck、客户端 lint/build 与 Docker 构建通过；
- 三种目标视口完成浏览器截图检查；
- 提供稳定 fixture 和 10 个只读 MCP evaluation 问题。

# Nubbi MCP Server

`nubbi-mcp-server` 让兼容 MCP 的 Agent 能够读取并安全操作已认证用户的 Nubbi 笔记。它不会直接连接 MongoDB：所有操作都通过 Nubbi Server 中权限受限的 `/mcp-api` 完成。

## 权限边界

请使用 Nubbi **MCP Agent** Token（`nb_...`），不要使用会话 Cookie。该 Token 可以读取所属用户的全部笔记，但只能创建和修改 `source` 为 `agent` 的笔记。

- 允许的写操作：创建、编辑内容或属性、移动、归档、移入回收站和恢复。
- 新笔记始终是私有的 `agent` 笔记，且 `status=inbox`。
- 不支持：发布、永久删除、文件、会议或跨用户访问。
- 如果移动、移入回收站或恢复的子树中包含用户创建的后代笔记，系统会在修改前拒绝操作；层级结构写入按用户串行执行。
- 编辑内容时必须提供 `contentRevision`；其他编辑使用 `updatedAt` 防止更新丢失。

建议每个部署环境使用独立 Token，以便分别审计和撤销。切勿将 Token 写入提示词或工具参数。

## 安装与构建

在仓库根目录执行：

```bash
pnpm install
pnpm --filter nubbi-mcp-server build
pnpm --filter nubbi-mcp-server test
```

需要 Node.js 20 或更高版本。该包将 `@modelcontextprotocol/sdk` 固定为 `1.29.0`，并使用 Zod 4 严格 Schema。

## 本地 stdio

设置 API 地址和权限受限的密钥。协议消息仅通过 stdout 输出，诊断信息仅通过 stderr 输出。

```bash
NUBBI_API_URL=http://localhost:4000 \
NUBBI_API_KEY=nb_replace_me \
node mcp/dist/stdio.js
```

MCP Host 配置示例：

```json
{
  "mcpServers": {
    "nubbi": {
      "command": "node",
      "args": ["/absolute/path/to/Nubbi/mcp/dist/stdio.js"],
      "env": {
        "NUBBI_API_URL": "http://localhost:4000",
        "NUBBI_API_KEY": "nb_replace_me"
      }
    }
  }
}
```

启动时会通过 `/mcp-api/context` 验证 Token；如果密钥无效、已过期、已撤销或权限范围不正确，进程会停止并向 stderr 输出错误。

## 无状态 Streamable HTTP

```bash
MCP_TRANSPORT=http \
NUBBI_API_URL=http://localhost:4000 \
MCP_HOST=0.0.0.0 \
MCP_PORT=3100 \
MCP_ALLOWED_HOSTS= \
MCP_ALLOWED_ORIGINS=https://app.example.com \
node mcp/dist/http.js
```

- MCP 端点：`POST /mcp`
- 健康检查端点：`GET /health`（绝不会返回 Token 或用户详情）
- 身份认证：`Authorization: Bearer nb_...`
- 响应：仅使用 JSON 的无状态 Streamable HTTP；未启用 GET/SSE 会话。
- `Host` 以及请求中存在的 `Origin` 必须与各自的允许列表完全匹配。

远程使用时，请在可信反向代理处终止 TLS，并且仅对外提供 HTTPS。不要将 3100 端口直接暴露到公网。对于不发送 Origin Header 的非浏览器客户端，`MCP_ALLOWED_ORIGINS` 可以为空；系统会拒绝通配符 Origin。

Docker Compose 使用 `mcp/Dockerfile` 构建此包。请在部署环境中配置公网 Host 和 Origin 允许列表。
默认情况下，Compose 将 3100 端口绑定到 `127.0.0.1`，供宿主机上的 TLS 反向代理使用。只有确实需要绑定其他网络接口时才应显式设置 `MCP_BIND_ADDRESS`；切勿将明文 HTTP 端口直接暴露到公网。

## 工具

| 工具 | 用途 |
| --- | --- |
| `nubbi_list_notes` | 分页列出笔记元数据，并支持筛选 |
| `nubbi_search_notes` | 在标题、Markdown 和标签中进行字面搜索 |
| `nubbi_get_note` | 读取元数据、祖先节点、修订版本和分段 Markdown 内容 |
| `nubbi_get_notes` | 批量读取多篇笔记（1-20 篇），减少逐篇读取的请求次数 |
| `nubbi_create_note` | 创建私有的 Agent 收件箱笔记 |
| `nubbi_edit_note_content` | 替换、追加、前置或唯一匹配替换文本 |
| `nubbi_update_note_properties` | 更新标题、作者、日期、标签和元数据 |
| `nubbi_move_note` | 移动 Agent 笔记或将其设为根笔记 |
| `nubbi_archive_note` | 归档 Agent 笔记或将其恢复为活跃状态 |
| `nubbi_trash_note` | 软删除符合条件的 Agent 笔记子树 |
| `nubbi_list_trash` | 分页列出已软删除的笔记 |
| `nubbi_restore_note` | 恢复符合条件的 Agent 笔记子树 |

所有工具都会返回简洁文本和 `structuredContent`。列表工具默认返回 20 条，最多返回 50 条。笔记内容按段读取，每段最多 20,000 个字符。过大的结构化响应会被截断，并明确给出分页或筛选建议；工具文本不会超过 25,000 个字符。

## 安全操作流程

向笔记追加内容：

1. 通过搜索或列表获取 `note_id`。
2. 使用 `nubbi_get_note` 读取笔记。
3. 调用 `nubbi_edit_note_content`，并传入上一步返回的 `contentRevision`。
4. 如果调用返回 409，请重新读取笔记，再有意地重新应用修改。

调整笔记层级前，请先读取源笔记和目标笔记，再将源笔记的 `updatedAt` 传给 `nubbi_move_note`。将 `parent_id` 设为 `null` 可把笔记移动到根节点。

如需撤销软删除，请先列出回收站内容，复制 Agent 笔记的 `deletedAt`，并在恢复子笔记前先恢复其父笔记。永久删除仍只能由用户在界面中操作。

写操作绝不会自动重试。只读调用仅在短暂网络故障或 502/503/504 错误时重试一次。

## 错误处理

- `401`：更换无效、已过期或已撤销的 Token。
- `403`：使用 MCP Agent Token，或选择由 Agent 创建的笔记。
- `404`：重新列出或搜索；系统会有意让不可访问笔记与其他用户的笔记表现一致。
- `409`：重新读取当前修订版本或时间戳，或解决混合子树/父节点冲突。
- `429`：等待后降低请求频率或分页大小。

工具调用失败时会返回 `isError: true`，在 Nubbi 提供安全的冲突数据时予以保留，并给出下一步修正操作。

## 评估

`evaluations/fixture-notes.json` 描述了一组稳定的历史测试数据。请在专用测试账户中写入这些笔记并保留其 ID 和层级关系，然后使用 MCP 评估工具运行 `evaluations/note-fixture-evaluations.xml` 中十个相互独立的只读问题。评估文件不需要使用任何写工具。

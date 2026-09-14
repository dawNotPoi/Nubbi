# Knowledge Base 讨论记录

## [2026-07-11] Note MCP 权限与部署

### 已决策

| # | 决策 | 理由 |
| --- | --- | --- |
| 1 | MCP 同时支持 stdio 与 Streamable HTTP | Nubbi 同时存在本地和云端部署 |
| 2 | 复用 Better Auth API Key，并新增固定 MCP 预设 | 避免重复 Token 系统，同时建立真实最小权限 |
| 3 | MCP 读全部本人笔记，只写 Agent 笔记 | Agent 可获取上下文，但不直接改写人类原稿 |
| 4 | MCP 无发布和永久删除 | 发布与不可逆操作保留给人类 |
| 5 | 回收站 UI 补齐恢复和永久删除 | 现有 API/atoms 已具备，缺少用户界面 |
| 6 | HTTP 首版使用私有 Bearer Token | 先覆盖自部署，公开接入再实现 OAuth 2.1 |

### 关键上下文

- Note 正文为 Markdown，已存在 `contentRevision` 冲突检测。
- 回收站后端已有 `trash/restore/purge`，UI 尚未实现。
- 历史 Phase 2 PRD 的独立 MCPToken、SSE-only 和文件夹 scope 方案已废弃。

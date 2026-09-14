# Agent 规范

> **入口文件** — Agent 启动时读取此文件，了解项目全局上下文。
> 详细规则见 `.agent/rules/`，操作指南见 `.agent/skills/`。

## 技术栈

| 层级 | 技术 |
|------|------|
| 服务端 | Express 4.x + Mongoose 8.x + Zod 3.x + Better-Auth 1.x |
| 客户端 | React 18.x + Ant Design 5.x + Tailwind 3.x + Vite 5.x |
| 状态管理 | TanStack Query（服务端状态）+ Jotai（UI 状态） |
| 约束 | ❌ 禁止引入重量级替代品（Redux、Prisma、tRPC）；工具包可合理使用 |

## 模块索引

> `Agent` 通过 `.agent/module-index.md` 判断代码变更属于哪个模块，决定需要更新哪个 PRD。

| 模块 | PRD | 关键路径 |
|------|-----|---------|
| note | docs/note/PRD.md | `server/app/routes/note.ts`, `client/src/views/note/**` |
| auth | docs/auth/PRD.md | `server/app/routes/auth.ts`, `client/src/views/login/**` |
| meeting | docs/meeting/PRD.md | `server/app/routes/meeting.ts`, `client/src/views/meetings/**` |
| file | docs/file/PRD.md | `server/app/routes/file.ts`, `client/src/views/file-manage/**` |
| knowledge-base | docs/knowledge-base/ | `server/app/services/kb/**`, `mcp/**` |
| infrastructure | docs/infrastructure/PRD.md | `server/app/middleware/**`, `client/src/component/UI/**` |

完整匹配规则见 `.agent/module-index.md`。

## 工作流

```
沟通方案 → 更新 PRD → 编写代码 → review → 更新 changes → commit
```

详细步骤见 `.agent/skills/workflow.md`，审查流程见 `.agent/skills/review.md`。

## 核心约束

### 架构
- 分层：Route → Controller → Model，禁止跨层调用
- 文件目录各司其职：controller / models / routes / middleware / lib
- 单文件 ≤ 200 行，超出则拆分
- 禁止在组件中直接读写 Cookie / LocalStorage

### 编码
- 见 `.agent/skills/code.md`（服务端/客户端约定）
- 见 `.agent/skills/style.md`（颜色 Token、布局、组件选用）

### 提交
- 格式：`<type>(<scope>): <subject>` — type/scope 用英文，subject 用中文
- 提交前必更新 `docs/changes/YYYY-MM-DD.md`
- commit 由用户决定，不主动提交

完整规则见 `.agent/rules/core.md`。

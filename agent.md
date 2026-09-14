# Agent 规范

> **入口文件** — Agent 启动时读取此文件，了解项目全局上下文。
> 默认只读本文件；按任务需要再读取下方路由表中的细分规范，避免一次性塞入过多上下文。

## 必读

1. 只有用户要求更新 changes 或 commit 时才更新 `docs/changes/YYYY-MM-DD.md`，其他时候不自动更新。
2. 用户要求 commit 时：①更新 changes → ②展示暂存区统计 → ③询问是否将相关改动加入暂存区 → ④让用户确认是否提交。
3. commit 由用户决定，不主动提交。

## 技术栈

| 层级 | 技术 |
|------|------|
| 服务端 | Express 4.x + Mongoose 8.x + Zod 3.x + Better-Auth 1.x |
| 客户端 | React 18.x + Ant Design 5.x + Tailwind 3.x + Vite 5.x |
| 状态管理 | TanStack Query（服务端状态）+ Jotai（UI 状态） |
| 约束 | ❌ 禁止引入重量级替代品（Redux、Prisma、tRPC）；工具包可合理使用 |

## 按需读取

| 场景 | 读取 |
|------|------|
| 判断模块、PRD 或文件归属 | `.agent/module-index.md` |
| 编码前确认硬规则 | `.agent/rules/core.md` |
| 服务端/客户端编码细节 | `.agent/skills/code.md` |
| UI / Tailwind / 组件选型 | `.agent/skills/style.md` |
| 工作流或 changes 格式 | `.agent/skills/workflow.md` |
| code review | `.agent/skills/review.md` |
| 长方案讨论需要沉淀 | `.agent/rules/discussion-log.md` |

原则：先读入口和当前任务相关文件，不要为了简单改动读取所有 agent 文档。

## 工作流

```
沟通方案 → 更新 PRD → 编写代码 → review → （用户要求时）更新 changes → commit
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
- 只有用户要求更新 changes 或 commit 时才更新 `docs/changes/YYYY-MM-DD.md`
- 用户要求 commit 时：①更新 changes → ②展示暂存区统计 → ③询问是否将相关改动加入暂存区 → ④让用户确认是否提交
- commit 由用户决定，不主动提交

完整规则见 `.agent/rules/core.md`。

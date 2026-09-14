# Agent 规范

> **入口文件** — Agent 启动时读取此文件，了解项目全局上下文。
> 默认只读本文件；按任务需要 + 变更文件路径匹配下方路由表，避免一次性塞入过多上下文。

## 必读

1. 按下方路由表，根据**场景 + 变更文件路径**匹配需要读取的规范文件。
2. 规范文件内部标注了生效路径，agent 可根据变更文件判断是否适用。

## 技术栈

| 层级 | 技术 |
|------|------|
| 服务端 | Express 4.x + Mongoose 8.x + Zod 3.x + Better-Auth 1.x |
| 客户端 | React 18.x + Ant Design 5.x + Tailwind 3.x + Vite 5.x |
| 状态管理 | TanStack Query（服务端状态）+ Jotai（UI 状态） |

引入新依赖前检查 `.agent/rules/core.md` 禁止项。

## 按需读取

| 场景 | 匹配路径（glob） | 读取 |
|------|-----------------|------|
| 编码前确认硬规则 | `**/*` | `.agent/rules/core.md` |
| 判断模块、PRD 或文件归属 | `**/*`（不确定时） | `.agent/module-index.md` |
| 服务端编码细节 | `server/**` | `.agent/skills/code.md` |
| 客户端编码细节 | `client/**` | `.agent/skills/code.md` |
| UI / Tailwind / 组件选型 | `client/src/**` | `.agent/skills/style.md` |
| 工作流或 changes 格式 | `**/*`（任务涉及代码变更时） | `.agent/skills/workflow.md` |
| code review | `**/*`（review 阶段） | `.agent/skills/review.md` |
| 长方案讨论需要沉淀 | `docs/**`（讨论时） | `.agent/rules/discussion-log.md` |

原则：先读入口和匹配路径的规范文件，不要为了简单改动读取所有 agent 文档。

## 工作流

```
沟通方案 → 更新 PRD → 编写代码 → review → （用户要求时）更新 changes → commit
```

步骤和 changes 格式详见 `.agent/skills/workflow.md`；规则约束见 `.agent/rules/core.md`。

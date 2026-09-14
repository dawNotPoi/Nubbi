# Agent 规范

> **入口文件** — Agent 启动时读取此文件，了解项目全局上下文。
> 默认只读本文件；按任务需要 + 变更文件路径匹配下方路由表，避免一次性塞入过多上下文。

## 必读

1. 按下方路由表，根据**场景 + 变更文件路径**匹配需要读取的规范文件。
2. 规范文件内部标注了生效路径，agent 可根据变更文件判断是否适用。

## 技术栈

| 层级     | 技术                                                   |
| -------- | ------------------------------------------------------ |
| 主服务端 | Express 4.x + Mongoose 8.x + Zod 3.x + Better-Auth 1.x |
| Assistant API | NestJS 11.x + Fastify 5.x + Mongoose 8.x + Zod 3.x |
| 客户端   | React 18.x + Ant Design 5.x + Tailwind 3.x + Vite 5.x  |
| 状态管理 | TanStack Query（服务端状态）+ Jotai（UI 状态）         |

引入新依赖前检查 `.agent/rules/core.md` 禁止项。

## 按需读取

| 场景                     | 匹配路径（glob）             | 读取                             |
| ------------------------ | ---------------------------- | -------------------------------- |
| 编码前确认硬规则         | `**/*`                       | `.agent/rules/core.md`           |
| 判断模块、PRD 或文件归属 | `**/*`（不确定时）           | `.agent/module-index.md`         |
| 服务端编码细节           | `server/**`                  | `.agent/skills/code.md`          |
| 客户端编码细节           | `client/**`                  | `.agent/skills/code.md`          |
| UI / Tailwind / 组件选型 | `client/src/**`              | `.agent/skills/style.md`         |
| 工作流或 changes 格式    | `**/*`（任务涉及代码变更时） | `.agent/skills/workflow.md`      |
| code review              | `**/*`（review 阶段）        | `.agent/skills/review.md`        |
| 长方案讨论需要沉淀       | `docs/**`（讨论时）          | `.agent/rules/discussion-log.md` |

原则：先读入口和匹配路径的规范文件，不要为了简单改动读取所有 agent 文档。

## 工作流

```
沟通方案 → 更新 PRD → 编写代码 → review → （用户要求时）更新 changes → commit
```

步骤和 changes 格式详见 `.agent/skills/workflow.md`；规则约束见 `.agent/rules/core.md`。

## 测试文件

- 本项目当前不需要自动化测试。除非用户明确要求，Agent 不得创建、恢复或修改测试文件。
- 不得新增 `*.test.*`、`*.spec.*` 或位于 `test/`、`tests/` 目录中的测试代码。

## 代码注释

- 新增或修改的代码注释必须使用中文，包括单行注释、块注释和 JSDoc/TSDoc。
- 函数必须写 JSDoc/TSDoc；公开/导出的函数需用 `@param` 注明每个入参、用 `@returns` 注明出参：
  ```ts
  /**
   * 把长文本切成小段逐个推送，前端能更流畅地渲染流式输出。
   * @param text 待推送的完整文本。
   * @param emit 事件回调，用于逐段发送 text-delta 事件。
   * @returns 无返回值。
   */
  ```
- 内部函数按需补全：逻辑非显而易见（状态变更、边界处理、副作用）时同样写明入参与出参。
- 注释应说明业务意图、约束或非显而易见的原因，避免仅重复代码本身。

## 文件职责

- 手写源码单文件上限为 1500 行（含注释与空行），按完整职责封装，不为行数上限压缩语句或机械拆分；上限不是目标，职责混杂时应提前拆分。
- 文件应放在与其职责和业务归属一致的目录中，禁止为了方便而将领域专属代码放入通用目录。
- `common/` 仅用于不依赖具体业务领域、可被多个模块复用的基础能力。
- 路由请求 Schema、DTO 和协议转换属于接口层，应放在对应路由或模块目录附近。
- Controller、Service、Model 和 Route 不得相互混放职责；跨层复用前应先确认该能力是否确实与具体业务无关。

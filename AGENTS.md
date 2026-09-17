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
| 客户端   | React 19.x + Base UI + 项目自有 UI 源码层（shadcn 风格）+ Ant Design 5.x（迁移期）+ Tailwind 4.x + Vite 5.x |
| 状态管理 | TanStack Query（服务端状态）+ Jotai（UI 状态）         |

引入新依赖前检查 `.agent/rules/core.md` 禁止项。

## UI 长期约束

以下是已确认的稳定方向；具体实现、Token、品牌和验收细则必须继续读取 `.agent/skills/style.md` 与 `docs/ui/rebuild-plan.md`。

- Nubbi 的视觉方向固定为 **Warm Neutral + Soft Semantic Accents + Mascot Identity**：暖白 / 暖灰负责大面积空间，蓝 / 青绿 / 紫 / 琥珀等只承担品牌、对象身份和状态，不把页面做成彩色 Dashboard。
- 产品品牌默认使用 **NUBBI**；中文名不是必需 UI 元素。
- 品牌 Logo 固定使用用户已确认的 **高光眼睛便签精灵**。该 Logo 是品牌资产，不允许 Agent、生成模型或业务页面重新演绎另一版角色；只允许调整尺寸、位置、留白和 lockup。
- UI 可以带轻二次元、陪伴感，但主体必须仍是现代生产力工具；禁止把品牌风格扩张成满屏动漫装饰、霓虹渐变、玻璃拟态或游戏 HUD。
- UI 使用 System UI 字体栈，常用字重 400 / 500 / 600；不为“高级感”额外引入装饰字体。
- 基础控件源码统一放 `client/src/components/ui/`，以 Base UI 作为交互原语；不要新增平行的 Button / Input / Menu / Sheet 组件体系。
- 当前是项目自有、shadcn 风格的源码组件层，不得把它描述为已经完成 canonical shadcn CLI 迁移；也不得重新执行 `shadcn init` 覆盖主题。
- Desktop 与 Mobile 是**不同 interaction model**，但共享 controller、数据契约与 Design Token：
  - Desktop：Sidebar + Content + compact toolbar + Dropdown/Popover + hover / drag-drop。
  - Mobile：Bottom Navigation + Page + Bottom Sheet + press；**不渲染 Desktop Sidebar**。
- Desktop Sidebar 的普通导航图标使用中性 Lucide 风格；模块语义色主要进入内容区、快捷动作和真实状态，不长期给每个导航项分配不同颜色。
- Mobile 一级导航固定为「首页 / 笔记 / 文件 / 更多」；二级页默认隐藏 Bottom Navigation。
- Mobile 复杂操作优先使用共享 Sheet；普通浏览不常驻 checkbox，长按/菜单进入独立 Selection Mode。
- Mobile 不要求逐一复刻 Desktop interaction；只要求同一用户任务有清晰、安全的完成路径。例如文件移动代替手机端 Drag & Drop。
- 图标默认统一使用 `lucide-react`；hit box、layout box、SVG visual size 分离。禁止用 `translate-y` 或负 margin 修图标基线。
- UI 重构不得改变已有权限、确认、保存、删除、恢复、上传等业务语义。
- 概念图中的控件只有在真实业务契约存在时才能进入实现；禁止加入不能工作的假搜索、假按钮或占位功能。
- 当前首页快捷动作本轮只允许真实存在的「新建笔记 / 上传文件 / 创建会议」；AI 对话、扩展便签与更强统一搜索属于未来扩展，不在本轮 UI 重构中实现。

## UI 提交前 Review Gate

用户已要求 UI 变更**先 review，再提交**。

- 普通本地 Git 流程：形成完整 patch → static UI review → 再 commit。
- 直接使用 GitHub Contents 等“写入即 commit”的工具时：必须在工具写入前完成 pre-write review，不能把远端 commit 当 staging area。
- Review 至少检查：业务回归、Desktop/Mobile interaction model、品牌一致性、icon geometry、触控目标、hover 依赖、文本溢出、focus、safe area、destructive flow。
- 品牌 review 必须检查：Logo 是否仍为已确认便签精灵、是否出现第二套 Logo、Sidebar / Auth / favicon 是否使用同一资产。
- 提交后继续执行 lint / build / Preview 验证；**Build / Deploy 成功不等于视觉验收通过**。
- 没有实际浏览器或设备证据时，只能报告 static review 与 CI 状态；不得声称视觉验收通过。

## 按需读取

| 场景                     | 匹配路径（glob）             | 读取                             |
| ------------------------ | ---------------------------- | -------------------------------- |
| 编码前确认硬规则         | `**/*`                       | `.agent/rules/core.md`           |
| 判断模块、PRD 或文件归属 | `**/*`（不确定时）           | `.agent/module-index.md`         |
| 服务端编码细节           | `server/**`                  | `.agent/skills/code.md`          |
| 客户端编码细节           | `client/**`                  | `.agent/skills/code.md`          |
| UI / Tailwind / 组件选型 | `client/src/**`              | `.agent/skills/style.md`         |
| 全站 UI 重构 / 品牌方向  | `client/**`（涉及 UI 重构时） | `docs/ui/rebuild-plan.md`        |
| 工作流或 changes 格式    | `**/*`（任务涉及代码变更时） | `.agent/skills/workflow.md`      |
| code review              | `**/*`（review 阶段）        | `.agent/skills/review.md`        |
| 长方案讨论需要沉淀       | `docs/**`（讨论时）          | `.agent/rules/discussion-log.md` |

原则：先读入口和匹配路径的规范文件，不要为了简单改动读取所有 agent 文档。

## 工作流

```text
沟通方案
→ 更新 PRD / 明确验收口径（需要时）
→ 形成完整 patch 方案
→ 提交前 review
→ 编写 / 写入代码
→ lint / build / 类型与运行验证
→ Preview / 实际交互验收
→ （用户要求时）更新 changes
→ 完成
```

直接写远端的工具将“写入代码”与“commit”合并，因此必须把 review 前移到写操作之前。
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

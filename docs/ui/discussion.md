# UI 讨论记录

## [2026-09-17 11:45] 第 1 轮：NUBBI 品牌与全站 UI 重构方向冻结

### 参与方
- 用户、Agent

### 已决策

| # | 决策 | 理由 |
|---|---|---|
| 1 | 产品主品牌使用 `NUBBI`，中文名不强制展示 | 英文品牌更适合当前界面与后续扩展 |
| 2 | 最终 Logo 使用用户已选中的“高光眼睛便签精灵” | 相比几何 N / 渐变 Logo，更符合轻二次元、陪伴型生产力工具气质 |
| 3 | Logo 作为固定品牌资产，不允许页面或生成模型重新演绎 | 避免登录页、Sidebar、favicon 出现不同角色版本 |
| 4 | 视觉基底采用暖白 / 暖灰 + 小面积明亮语义色 | 解决纯蓝白灰过冷、单调，同时保持内容优先 |
| 5 | Sidebar 普通导航恢复中性 Lucide 图标 | 彩色导航图标在 PC Sidebar 中过碎，颜色应主要留给内容和状态 |
| 6 | Desktop 与 Mobile 保持不同 interaction model | 已验证 Mobile Bottom Nav / Sheet 模式更适合手机，Desktop 继续 Sidebar + Content |
| 7 | Auth 使用已确认的品牌化左右分栏设计逻辑 | 登录页承担最完整的品牌表达，移动端则简化为品牌 + Auth card |
| 8 | 首页重心应为最近内容，会议空状态必须 compact | 当前 PC 首页空会议区域视觉权重过高 |
| 9 | 首页快捷动作本轮只保留新建笔记 / 上传文件 / 创建会议 | 新建文件夹不属于高优先首页动作；AI 对话和扩展便签留待后续 |
| 10 | 不添加不可工作的全局搜索 | 概念图中的控件必须有真实业务契约才能进入实现 |
| 11 | 重构顺序固定为 Brand → Token → Primitive → Auth → Shell → Home → Notes → Files → Secondary → Polish | 先稳定底层规则，避免逐页重构再次漂移 |
| 12 | 每个 Phase 独立 review / commit / CI / Preview 验收 | 保留历史与回滚点，避免大批量 UI 变更不可审查 |

### 待决策

- [ ] 最终 Logo 源资产采用 PNG / SVG 哪一种作为 canonical source；要求保持当前已选角色造型，不重新绘制。
- [ ] Auth 左侧品牌插画是否采用固定插画资产，还是使用更轻的 CSS / 背景视觉。
- [ ] Desktop Home 最近笔记的真实 cover 数据覆盖率；无 cover 时采用哪种最终 fallback。
- [ ] Phase 9 是否同时处理当前大 bundle 的 code splitting，还是另开性能任务。

### 关键上下文（给下一个 agent）

- 当前实施分支：`preview`。
- UI 重构计划：`docs/ui/rebuild-plan.md`。
- 全局 UI 规则：`AGENTS.md`、`.agent/skills/style.md`。
- Mobile 主交互已经重构并通过用户初步认可：Home / Notes / Files / More、Bottom Sheet、Selection Mode。
- Base UI Drawer 曾因 `VirtualKeyboardProvider` 放在 `Drawer.Root` 外导致移动端 error #27，现已修正；后续不得破坏 Root context 层级。
- Preview 公网地址当前通过服务器公网 IPv4 + `:8088` 验证；部署 CI 已包含 public health check。
- PC 已做一轮 semantic color / workspace density 改造，但新的品牌视觉尚未正式写入运行代码。
- 当前旧 favicon 仍是金黄色 Sparkles，属于 Phase 0 待替换资产。
- 不合并到 `dev/out`，直到用户完成 PC + Mobile 实际视觉验收。

### 讨论摘要

本轮从“蓝白灰偏单调”的反馈出发，经过多轮 Logo 与页面设计探索，最终确定 NUBBI 应当是一个带轻二次元陪伴感的现代生产力工具。用户选择了高光眼睛的便签精灵作为品牌角色，并认可暖白底、明亮语义色、轻量插画的整体设计逻辑。后续不再逐页试色，而是按品牌、Token、基础组件、Auth、Shell 和业务页面的顺序系统性重构。AI 对话、扩展便签和统一搜索只保留未来扩展空间，不进入本轮实现。

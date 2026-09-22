# Nubbi UI 重构计划

> 状态：已确认方向，待分阶段实施
> 当前实施分支：`refactor/ui-unification-local`
> 原则：先冻结品牌与设计系统，再改基础组件，最后逐页重构；每个阶段单独 review、commit、CI、Preview 验收。

## 1. 目标

本轮重构不是继续微调旧的蓝白灰界面，而是把已经确认的设计方向系统化落地：

- 保留 Nubbi 作为产品主品牌名。
- 使用已选定的 **高光眼睛便签精灵 Logo** 作为唯一品牌角色，不再重新演绎 Logo 造型。
- 视觉基底使用暖白 / 暖灰，加入明亮但小面积的蓝、青绿、紫、琥珀和粉色语义色。
- UI 具备轻二次元、陪伴感，但主体仍然是现代生产力工具，而不是游戏界面或营销页。
- Desktop 与 Mobile 保持两套 interaction model，共享数据、controller、Design Token 与基础组件。
- UI 重构不改变权限、保存、删除、恢复、上传、会议审批等既有业务语义。

## 2. 已冻结的设计决策

### 2.1 品牌

- 产品名：`NUBBI`。
- 主 Logo：用户已选中的便签精灵角色，特征包括：
  - 蓝色便签 / 页面轮廓；
  - 右上角折页；
  - 两只带高光的深色眼睛；
  - 极简嘴部与淡粉腮红；
  - 左上方少量蓝 / 黄 / 青绿色短线强调；
  - 搭配深墨灰 `NUBBI` 字标。
- Logo 属于固定品牌资产。后续页面只允许调整尺寸、位置、留白和 lockup，不允许让生成模型或业务组件重新绘制另一版角色。
- 中文品牌名不是必须元素。UI 默认使用 `NUBBI`，不强制展示“拾光笔记”。

### 2.2 视觉语言

关键词：

`Warm` / `Light` / `Focused` / `Playful` / `Companion-like` / `Modern productivity`

- 大面积背景仍由暖白和暖中性色承担。
- 彩色用于品牌、对象身份、状态与少量快捷动作，不用于所有 hover / selected。
- 不再采用“纯蓝白灰企业后台”或“科技蓝渐变 N Logo”方向。
- 不使用大面积高饱和渐变、玻璃拟态、霓虹发光和厚重 3D。
- 轻二次元感主要来自 Mascot、圆润比例、柔和插画和局部小表情，不靠满屏动漫装饰。

### 2.3 语义色目标

下列值是实施起点，最终以真实页面视觉 QA 为准；业务组件只消费 Token，不直接写这些值。

| 角色 | 建议起点 | 用途 |
|---|---:|---|
| Primary / Note | `#3B82F6` | 主操作、笔记、focus、链接 |
| File | `#10B981` | 文件、上传成功、文件相关快捷动作 |
| Meeting | `#8B5CF6` | 会议、协作 |
| Folder / Reminder | `#F59E0B` | 文件夹、提醒、温暖辅助强调 |
| Optional Accent | `#F472B6` | 极少量品牌/未来扩展强调，不作为常规导航色 |
| Danger | 现有 danger token | 删除、错误、不可逆动作 |

Sidebar 普通导航图标保持中性，不按模块长期染成蓝 / 绿 / 紫；对象色主要进入内容区与快捷动作。

## 3. 明确暂不做的功能

本轮不得为了匹配概念图而新增没有业务契约的功能。

- 首页暂不新增“新建文件夹”快捷动作。
- AI 对话入口：保留未来扩展位置，本轮不实现。
- 扩展便签 / Sticky Note：保留未来扩展位置，本轮不实现。
- 全局搜索：如果现有代码没有统一搜索契约，本轮不放置不可工作的搜索框。
- 不为首页随机生成假封面；笔记卡优先使用真实 cover，没有 cover 时使用轻量语义占位。

当前首页快捷动作只允许真实存在且可完成的任务：

1. 新建笔记
2. 上传文件
3. 创建会议

## 4. 目标组件架构

```text
Nubbi Brand Assets
        ↓
Nubbi Semantic Tokens
        ↓
client/src/components/ui        项目持有源码
        ↓
Base UI primitives              交互底座
        ↓
Shared controller / contracts
        ↓
Desktop Presenter / Mobile Presenter
```

2026-09-21 用户要求完成剩余迁移并移除 Ant Design。保留已有源码组件与主题，手动接入 shadcn/ui Base UI 配置，不重新初始化；迁移与验收见 [全量迁移计划](./antd-removal-plan.md)。

## 5. 分阶段实施

### Phase 0 — 品牌资产冻结

**目标**：先固定所有页面共同依赖的品牌资产。

任务：

- 将已确认 Logo 作为源资产保存到 `client/public/brand/`。
- 输出并接入：
  - 主 Logo：icon + `NUBBI` wordmark；
  - icon-only；
  - favicon；
  - 登录页 lockup；
  - Sidebar 小尺寸 lockup。
- 更新浏览器 `theme-color` 与旧 favicon。
- 禁止继续使用旧金黄色 Sparkles Logo。

验收：

- Sidebar、Auth、favicon 使用同一角色造型。
- 16 / 24 / 32 / 48px 下角色眼睛、折页和外轮廓仍可辨识。
- 不出现第二套 Logo。

建议 commit：

`feat(brand): freeze nubbi mascot identity`

---

### Phase 1 — Design Token 重构

**目标**：把确认的暖白 + 多语义色设计转成代码约束。

任务：

- 更新 `client/src/theme.css`。
- 保留现有 warm-neutral hierarchy，提升语义色清晰度。
- 明确：
  - canvas / surface / sidebar；
  - text primary / muted / subtle；
  - border / hover / selected；
  - brand / primary；
  - note / file / meeting / folder / optional accent；
  - status / danger；
  - shadow / radius。
- `tailwind.config.js` 只映射语义 Token。
- 清理业务组件内新的 raw Tailwind palette 值。

验收：

- hover / selected 仍是中性语义。
- Sidebar 不因模块色变成彩色导航栏。
- 所有新颜色均有角色名，而不是 `blue-500` / `purple-500`。

建议 commit：

`refactor(ui): align nubbi semantic design tokens`

---

### Phase 2 — 基础组件统一

**目标**：让后续页面重构不再重复造样式。

优先组件：

- Button
- Input / PasswordInput
- Card / Panel
- SectionHeader
- EmptyState
- Badge / StatusPill
- Sheet / Dialog
- Sidebar nav item
- Mobile bottom nav
- Search field

任务重点：

- 主按钮恢复正常高度和垂直中心，避免截图中曾出现的“扁按钮”。
- 统一 icon visual box / hit box。
- EmptyState 提供 `compact` 与 `page` 两种密度。
- Card 不依赖统一假封面；支持真实 cover 与无 cover 两种 presenter。

验收：

- 同级操作在不同页面不再因控件来源不同而出现高度差。
- Desktop toolbar 28–32px；Mobile touch target ≥ 44px。

建议 commit：

`refactor(ui): consolidate nubbi primitives`

---

### Phase 3 — Auth 门面重构

**目标**：先把品牌最完整的场景落地。

范围：

- Login
- Register
- Forgot password
- Reset password

Desktop：

- 使用已确认的左右分栏语言。
- 左侧负责品牌氛围：Logo、简短品牌文案、柔和场景插画或渐变背景。
- 右侧为清晰 Auth card。
- 不重复出现多个强 Logo；主品牌区与表单区需要有主次。

Mobile：

- 不强行保留 Desktop 左侧视觉面板。
- 以 Logo + Auth card 为主，保留轻量背景氛围。
- 键盘弹出时不能遮挡主要提交操作。

验收：

- Login / Register / Reset 使用同一套 Brand Lockup、Input、Button。
- Loading / validation / error / disabled 状态完整。
- 不改变 Better-Auth 业务流程。

建议 commits：

`refactor(auth): introduce nubbi branded auth shell`

`style(auth): align register and recovery flows`

---

### Phase 4 — App Shell 重构

**目标**：把品牌和导航真正放回应用。

#### Desktop Sidebar

结构目标：

```text
NUBBI Brand Lockup

Home
Notes
Files
Meetings
────────
My Notes / Note Tree

[flex spacer]
Account / Avatar
```

规则：

- Brand 在顶部，用户头像从“品牌位置”分离出来。
- Account 保留原有头像菜单能力，可放到底部。
- Home / Notes / Files / Meetings 普通图标使用统一中性 Lucide 风格。
- active：中性 selected background + 深色文字 / 图标；不恢复蓝色左边框。
- upload / error 等真实状态可通过小 badge 使用语义色。

#### Mobile Shell

- 保留已认可的 `Home / Notes / Files / More`。
- Mascot / NUBBI 可出现在 Home 顶栏，不占据 Bottom Nav。
- 二级页继续隐藏 Bottom Nav。

验收：

- 品牌、账号、导航三个角色清楚分离。
- Sidebar 不再出现“所有模块各一种颜色”的碎片感。

建议 commits：

`refactor(shell): separate brand account and navigation`

`style(shell): align mobile and desktop brand presence`

---

### Phase 5 — Home 工作台重构

**目标**：用户一进入系统首先看到“接下来做什么”和“继续哪篇内容”。

#### Desktop

建议结构：

1. Greeting：根据客户端时间显示早上 / 下午 / 晚上问候 + 用户名。
2. 真实快捷动作：新建笔记 / 上传文件 / 创建会议。
3. 最近编辑：页面主内容。
4. 近期会议：次级内容。

最近笔记：

- 保留横向卡片，但降低营销感。
- 真实 cover 存在时显示；没有 cover 时使用轻量语义占位，不随机塞装饰图。
- 标题至少保留足够辨识空间。
- 重复作者头像不是必要信息时可弱化。
- 修复任何固定渐隐遮罩导致首张卡片发白的问题。

近期会议：

- 有会议：显示列表。
- 无会议：首页只显示 compact empty state，不允许大面积空状态成为视觉主角。
- `创建会议` 只保留一个主要入口，避免同一区域重复 CTA。

#### Mobile

- 保留已认可的 Mobile Home interaction。
- 视觉上向新品牌色与 mascot 靠拢，但不重新做导航结构。
- 快捷动作数量与真实功能一致。

验收：

- 首页第一视觉重心是最近内容，而不是空状态。
- 不新增假搜索 / 假功能。

建议 commits：

`refactor(home): establish nubbi workspace hierarchy`

`style(home): refine recent content and meeting states`

---

### Phase 6 — Notes 重构

**目标**：让最核心的记录流程完整进入新设计系统。

Desktop：

- NoteLibrary page header、toolbar、table/list、empty/error/loading 统一。
- Note identity 色只进入 icon / small accent / status，不染 selected row。
- 保留目录树、rename、move、delete、selection 等现有语义。

Mobile：

- 保持「最近 / 目录」。
- 保持独立 Search / Filter Sheet / Selection Mode。
- Note Detail 保持 focused editor。
- Mascot 不进入编辑器正文区，避免干扰内容。

验收：

- 从 Home → Notes → Detail 的视觉语言连续。
- Keyboard / IME / rename / selection 无回归。

建议 commits：

`refactor(notes): align library with nubbi design system`

`style(notes): polish editor and mobile note flows`

---

### Phase 7 — Files 重构

**目标**：统一文件对象色、操作密度和移动端任务路径。

Desktop：

- File toolbar / row / quota / pagination / empty state 使用统一 primitives。
- 文件类型色来自 semantic token。
- Drag & Drop、context menu、selection、rename 行为不变。

Mobile：

- 保持 Search / Filter Sheet / Action Sheet / Selection Mode。
- 上传、文件夹、普通文件有清晰但克制的身份色。

验收：

- 上传中不是 danger 红色。
- 移动 / 删除 / 下载 / 分享保持原业务确认和权限链。

建议 commit：

`refactor(files): align manager with nubbi design system`

---

### Phase 8 — Meetings / Trash / Secondary Pages

**目标**：收掉剩余旧视觉。

范围：

- Meetings
- Meeting management
- Trash
- Meeting Lobby
- Account / token / avatar dialogs
- 其他仍使用旧视觉的辅助页面

规则：

- Meeting violet 只承担对象身份和状态，不把整页染紫。
- Trash 的危险操作保持独立 confirmation。
- Active Meeting Room 可继续保持独立沉浸式 UI，不强制套 Workspace chrome。

建议 commits：

`refactor(meetings): align collaboration surfaces`

`style(ui): polish secondary workspace pages`

---

### Phase 9 — 系统级 Polish 与收口

检查：

- Logo / favicon / browser theme-color。
- icon geometry。
- typography / spacing / radius。
- hover / selected / pressed / focus。
- loading / skeleton / error / empty state。
- iOS / Android safe area 与 software keyboard。
- Desktop 1280 / 1440 / 1920。
- Mobile 常见窄屏与大屏。
- Browser zoom 125% / 150%。
- reduced-motion。
- bundle warning 与必要的 route/component code splitting 单独评估，不和视觉改动混在一起。

建议 commit：

`style(ui): complete nubbi visual polish`

## 6. Review 与验收矩阵

每个阶段都执行：

```text
Pre-write static review
→ 写入 / commit
→ lint
→ production build
→ Preview deploy
→ public health check
→ PC / Mobile real visual acceptance
```

### Static Review

- Business semantics 是否被意外修改。
- Desktop / Mobile interaction model 是否正确。
- Icon geometry：hit box / layout box / SVG size / baseline。
- 文字溢出与中文排版。
- focus / keyboard / IME。
- destructive flow。
- safe area / software keyboard。
- 是否新增 raw palette / parallel component system。

### Visual Acceptance

最低验收路径：

| 场景 | Desktop | Mobile |
|---|---|---|
| Auth | Login / Register / Reset | Login / Register / Reset |
| Shell | Sidebar / Account | Bottom Nav / More Sheet |
| Home | Greeting / actions / recent notes / meetings | Home / create flow |
| Notes | Library / Detail | Recent / Directory / Search / Detail |
| Files | List / DnD / preview | List / Sheet / selection |
| Meetings | Recent / Manage | Secondary page / create |
| Trash | Restore / delete | Restore / delete |

## 7. Commit 与回滚策略

- 每个 Phase 至少一个独立 commit；大 Phase 拆成 2–3 个语义清晰的 commit。
- 不把 Token、Auth、Shell、Home 混在一个大 commit。
- UI review fix 使用独立 `style(review): ...` / `fix(ui): ...` commit，保留审查轨迹。
- Preview 任一阶段出现严重回归，可直接回到上一阶段最后一个 green commit。
- 不合并到 `dev/out`，直到用户完成 PC + Mobile 实际验收。

## 8. 实施顺序

严格顺序：

```text
Phase 0 Brand
→ Phase 1 Tokens
→ Phase 2 Primitives
→ Phase 3 Auth
→ Phase 4 Shell
→ Phase 5 Home
→ Phase 6 Notes
→ Phase 7 Files
→ Phase 8 Secondary
→ Phase 9 Polish
```

其中 Phase 0–4 决定全站基调，禁止跳过直接逐页美化。

## 9. 后续扩展保留位

以下能力只保留产品与视觉扩展空间，不进入本轮实现：

- AI 对话 / Assistant workspace
- 扩展便签 / Sticky Notes
- 更强的统一搜索
- Mascot 的动态状态 / AI 陪伴反馈

未来加入时应复用当前品牌角色和 Design Token，不重新建立一套视觉体系。

## 10. 已知遗留与待办（本轮不修）

下列项已在 2026-09-21 AntD 全量迁移的静态 review 中确认，属于有意延后而不是漏项。动手改到相关组件时，先回来更新本节，再改代码。

| # | 遗留 | 现状与影响 | 处理建议 | 归属文档 |
|---|---|---|---|---|
| 1 | 浮层层级坐标不连续 | Sheet 用 `z-[70]/[71]`，桌面 Dialog 1000/1001、confirm 1100、Select/Popover 1200、Tooltip 1300、Toast 1400。当前组合覆盖正确；若将来在桌面 Dialog 之上再开 Sheet 会被压住 | 把 Sheet 抬到同一坐标段，或抽出集中定义的层级常量 | 本节 + `antd-removal-plan.md` 共享接口 |
| 2 | 移动端触控目标不满 44px | `sheet.tsx` 关闭键 40px、`toast.tsx` 关闭键 32px；其余 Button/Input/Select/Tabs/SheetRow 已是 `max-md:min-h-11` | 补齐到 `size-11`，不改视觉尺寸时用 hit box 扩展 | 本节 §6 Static Review |
| 3 | `toast as message` 过渡命名 | 10 个文件仍以 `message` 别名调用 toast，其中 4 处使用 `message.add({...})` 形状 | 迁移收尾时统一改名为 `toast` | `antd-removal-plan.md` 共享接口 |
| 4 | Popover `onClickOutside` 语义过宽 | Escape、触发按钮收起、点击外部都会触发 `onClickOutside`，调用端无法区分 | 确有需要时再拆分关闭原因 | `antd-removal-plan.md` 共享接口 |
| 5 | OAuth 弹窗超时强关窗口 | 3 分钟超时会 `close()` 弹窗，用户正在 GitHub 输入凭据时会被打断（有 toast 说明） | 评估改为只提示超时、不关窗 | `docs/auth/PRD.md` |
| 6 | Tabs 函数式 className 被丢弃 | `tabs.tsx` 仅在 `className` 为字符串时透传，函数形式静默失效 | 需要时支持函数形式 | `antd-removal-plan.md` 共享接口 |
| 7 | Divider / Image 未收拢 | `component/UI/Divider`（94 行）与 `component/UI/Image`（17 行）仍是真实实现，与 `components/ui/separator` 概念重叠，共 5 处调用 | 收拢到 `components/ui`，旧路径降为转导出 | `.agent/skills/style.md`、`docs/infrastructure/PRD.md` |

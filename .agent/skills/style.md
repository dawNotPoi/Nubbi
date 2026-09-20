# 样式约定

## 产品视觉方向

Nubbi 使用 **Warm Neutral + Soft Semantic Accents + Mascot Identity**。

目标是：内容优先、长期使用舒适的现代生产力工作区，同时通过固定 Mascot、圆润比例与柔和插画增加一点轻二次元陪伴感；不是纯蓝白灰企业后台，也不是游戏 UI 或营销页。

- 大面积界面由暖白与暖中性色负责：页面、侧栏、hover、selected、边框和次级文字。
- 明亮颜色只用于：品牌、主动作、对象身份、focus、checked control、状态与少量快捷入口。
- Hover、Selected、Pressed、Focus 必须是不同语义，不得用一个彩色背景同时承担所有状态。
- 不新增大面积渐变、强发光、玻璃拟态、高饱和卡片墙、霓虹边框或过度圆角。
- 轻二次元感主要来自 Mascot、插画、局部小表情和柔和比例，不靠满屏动漫装饰。
- 当前颜色、阴影和字体的唯一数值来源为 `client/src/theme.css`；业务组件不得复制另一套 hex/rgb 常量。

## 品牌 Identity

### 主品牌

- 产品主名称：`NUBBI`。
- 中文名不是必须 UI 元素，不在 Sidebar / Auth / Header 强制展示“拾光笔记”。
- `NUBBI` wordmark 使用深墨灰、圆润但克制的无衬线字形；不要彩虹字、立体字、泡泡字。

### Mascot Logo

唯一允许的主 Logo 是用户已确认的 **高光眼睛便签精灵**：

- 蓝色便签 / 页面轮廓；
- 右上角折页；
- 两只带高光的深色眼睛；
- 极简嘴部与淡粉腮红；
- 左上方少量蓝 / 黄 / 青绿色短线强调；
- 与深墨灰 `NUBBI` 字标组合。

该角色是固定品牌资产：

- 允许：调整尺寸、位置、留白、icon-only / lockup 组合。
- 禁止：让 Agent 或生成模型重新画另一张“相似 mascot”替代。
- 禁止：在登录页、Sidebar、favicon 各用一套不同角色。
- 禁止：把普通业务图标画成 mascot 风格；业务图标继续使用 Lucide。

品牌层级：

```text
Mascot + NUBBI = 产品是谁
Avatar + Username = 当前账号是谁
Lucide navigation = 用户要去哪里
```

三者不得混为一个视觉角色。

## Typography

- UI 使用 `--font-ui` 定义的 System UI 字体栈，中文依赖系统中文字体回退。
- 常用字重只使用 400 / 500 / 600；除非内容本身有明确排版需求，不新增 700+ 的 UI 字重。
- Desktop 常规 UI 以 14px 为基准；Mobile 核心导航、列表标题和 Sheet 行通常为 15px。
- 正文与编辑器优先保证阅读行高，不用紧凑 Dashboard 行高套中文长文本。
- 不全局使用负 letter-spacing；仅大标题在已验证情况下轻微收紧。
- Mascot 负责品牌性格，不通过装饰字体制造“二次元感”。

## 主题与语义 Token

- `client/src/theme.css` 是颜色、字体、阴影等视觉 Token 的唯一来源。
- `client/tailwind.config.js` 将语义 Token 映射为 Tailwind 工具类。
- `client/src/styles/primitives.css` 维护 Base UI 基础控件状态和浮层动效。
- 新样式优先消费语义 Token，不在业务页面使用 Tailwind 默认色板模拟主题色。

目标色彩角色：

| 语义 | 目标角色 | 建议起点 |
|---|---|---:|
| Primary / Note | 主操作、笔记、focus、链接 | `#3B82F6` |
| File | 文件、上传成功、文件快捷动作 | `#10B981` |
| Meeting | 会议、协作 | `#8B5CF6` |
| Folder / Reminder | 文件夹、提醒、温暖辅助强调 | `#F59E0B` |
| Optional Accent | 极少量品牌 / 未来扩展强调 | `#F472B6` |
| Danger | 删除、错误、不可逆动作 | 现有 danger token |

这些值是实施起点；最终数值以真实 UI 验收为准，但角色不可混乱。

| 语义 | 优先消费 |
|---|---|
| 页面 / 内容 / 侧栏 | `bg-canvas` / `bg-surface` / `bg-sidebar` |
| 正文 / 次级文字 | `text-text-primary` / `text-text-muted` / `text-text-subtle` |
| Hover / Selected | `bg-bg-hover` / `bg-bg-selected` |
| 控件边框 | `border-border-button` / `border-border-button-hover` / `border-border-row` |
| Brand | `--brand` / `--brand-soft` |
| Solid Primary | `--primary` / `--primary-hover` / `--primary-active` / `--primary-foreground` |
| Note | `--entity-note` / `--entity-note-soft` |
| File | `--entity-file` / `--entity-file-soft` |
| Meeting | `--entity-meeting` / `--entity-meeting-soft` |
| Folder | `--entity-folder` / `--entity-folder-soft` |
| Focus | `--focus-border` / `--focus-ring` |
| 危险动作 | `--danger-bg` / `--danger-hover` / `--danger-text` |
| 业务状态 | `--status-*-bg` / `--status-*-text` |

### 色彩使用原则

- Sidebar 普通导航图标保持中性；不要给 Home / Notes / Files / Meetings 永久分配蓝 / 绿 / 紫。
- 对象色主要进入内容区：icon tile、section icon、status、快捷动作和轻量 empty state。
- active / hover / pressed 默认由中性 token 表达，除非控件本身是 Primary CTA。
- 上传中不是 danger；danger 红只用于错误、删除、不可逆动作。
- 同一屏幕避免多个大面积彩色 Panel 互相争夺视觉重心。

## 基础组件架构

```text
Nubbi Brand Assets
        ↓
Nubbi semantic tokens
        ↓
client/src/components/ui  （项目持有源码）
        ↓
Base UI primitives       （焦点、键盘、Popup、Drawer 等交互底座）
        ↓
feature / page components
```

- `client/src/components/ui/` 是新的无业务基础控件唯一目录。
- 组件组织采用 shadcn 风格的项目自有源码模式；不要声称当前已经完成 canonical shadcn CLI 迁移，也不要重新 `shadcn init` 覆盖现有主题。
- Base UI 负责低层交互原语；feature 页面不得绕过共享层再包装一套 Button / Input / Menu / Sheet。
- Ant Design 处于迁移期兼容层：现有复杂 Select、通知、确认和未迁移业务可继续使用，但新基础控件不要新增 AntD 依赖。
- `component/UI/` 是旧兼容区，不新增与 `components/ui` 重复的基础控件。

## 基础视觉组件 Contract

### Button

- 同一操作层级必须具有相同高度、内边距与文字垂直中心。
- Primary CTA 使用 solid primary；Secondary 使用 outline / ghost。
- 禁止因为页面不同而直接用 AntD Button 和 Nubbi Button 做同级 CTA。
- Loading 必须保留原宽度并避免重复触发。

### Card / Panel

- 卡片是内容容器，不是营销 Banner。
- 默认圆角约 8–10px；不要为了“可爱”统一做 16–24px 大圆角。
- 有真实 cover 才显示真实 cover；没有 cover 时使用轻量语义占位，不随机塞装饰图片。
- Card shadow 极轻；列表与表格优先靠间距、边框、背景层级组织。

### Empty State

提供两种密度：

- `compact`：Home / 局部模块使用，低高度、单个 CTA。
- `page`：独立空页面或首次使用引导，可更完整。

首页不得让“无会议”等空状态比真实最近内容占更大视觉权重。

### Section Header

同一级 section 使用相同：

- 字号
- 字重
- icon visual size
- title-to-content spacing

对象色可以不同，但几何层级必须一致。

## Desktop 与 Mobile 是两套 Interaction Model

共享数据、controller、route contract、Design Token 和基础能力；**不要求共享导航、布局和操作暴露方式**。

### Desktop

- Sidebar + Content 是主结构。
- 高频工具可使用 compact toolbar、Dropdown / Popover、hover reveal 和拖拽。
- Sidebar 收起后可使用边缘唤回；展开时收起入口位于 Sidebar 自身，不在 Header 放空 hit target。
- Desktop 信息密度高于 Mobile，但仍保持暖中性背景和克制边框。
- Sidebar 顶部品牌与底部账号必须分离：品牌负责 NUBBI，账号负责用户菜单。
- 普通 Sidebar 导航图标为中性 Lucide；active 采用中性 selected background + 深色文字 / 图标。

### Mobile

- 不渲染 Desktop Sidebar，不提供 hamburger 代理桌面侧栏。
- 一级 Bottom Navigation 固定为：**首页 / 笔记 / 文件 / 更多**。
- `更多` 使用 Bottom Sheet，而不是侧滑 Desktop Sidebar。
- 二级页（例如 Note Detail、会议、回收站）默认隐藏 Bottom Navigation，使用 Back / Title / Action Header。
- `Notes` 使用「最近 / 目录」两个视图；搜索是独立 transient state；复杂筛选使用 Sheet。
- `Files` 与 Notes 使用同一套 mobile vocabulary：Search / Filter Sheet / Action Sheet / Selection Mode。
- Mobile 不模拟 Desktop Drag & Drop；使用 Move 操作完成同一任务。
- Normal Browse 不常驻 checkbox；长按或菜单进入 Selection Mode。Selection Mode 中行点击只负责选择，Bottom Navigation 被批量操作栏替代。
- 普通复杂操作（More / Create / Filter / Note Actions / File Actions）优先使用 `components/ui/sheet`。

## Auth 视觉 Contract

Auth 是品牌表达最完整的场景。

### Desktop

- 使用左右分栏：左侧品牌氛围，右侧 Auth card。
- 左侧可包含 Mascot + NUBBI、简短文案、柔和场景插画或背景层次。
- 右侧只保留必要的 Login / Register / Recovery 表单，不堆叠重复品牌元素。
- 不允许为了匹配概念图加入不存在的第三方登录方式或不可工作的控件。

### Mobile

- 不强行复刻 Desktop 左侧视觉面板。
- 以 Mascot + NUBBI + Auth card 为主，保留轻量背景氛围。
- 软件键盘出现时主要提交按钮仍可完成操作。

### Auth 业务边界

- 视觉重构不得改变 Better-Auth 流程、session、验证、忘记密码和错误处理语义。
- Login / Register / Reset 使用同一 Button / Input / Error / Loading vocabulary。

## Home 视觉 Contract

Home 是工作台，不是营销首页。

建议信息层级：

```text
Greeting
→ Real Quick Actions
→ Recent Notes / Recent Content
→ Upcoming Meetings
```

- Greeting 可根据客户端时间显示早上 / 下午 / 晚上问候 + 用户名。
- 当前真实快捷动作只包括：新建笔记 / 上传文件 / 创建会议。
- 新建文件夹不进入当前 Home 快捷动作。
- AI 对话、扩展便签、统一搜索属于未来产品扩展，不得提前放不可工作的入口。
- Recent Notes 是 Home 主内容。
- Upcoming Meetings 是次级内容；无会议时使用 compact empty state，并只保留一个 CTA。
- 不因为概念图好看而生成随机假 cover；优先真实数据。

## Mobile Touch Contract

触控热区与图标视觉尺寸必须分离。

| 场景 | Hit area | Icon visual size |
|---|---:|---:|
| Header action | ≥44px | 20–21px |
| Bottom Nav item | ≥56px 高 | 20–22px |
| List trailing action | ≥40–44px | 18–20px |
| Tree / expand action | ≥40px | 18px |
| Sheet row | ≥48px | 20px |
| Desktop toolbar | 28–32px | 14–16px |

- 禁止通过 `translate-y` / 负 margin 修正图标视觉中心。
- Button variant 应拥有内部 SVG 尺寸；业务调用端不要同时重写 hit box 与 SVG size。
- List row 等大面积控件按压只使用中性背景反馈，不做整体 scale；小型独立 Icon Button 才可在需要时使用极轻 scale。
- Touch UI 不得依赖 hover 才暴露关键操作。
- 长按选择需要允许轻微手指漂移；滚动位移超过阈值后取消，不得“任意 pointermove 即取消”。

## Sheet 规则

- Mobile Bottom Sheet 统一复用 `client/src/components/ui/sheet.tsx`。
- Sheet 使用 Base UI Drawer 的 focus、swipe、keyboard 能力，不自行拼 `fixed div + overlay` 模拟交互。
- `Drawer.VirtualKeyboardProvider` 必须处于 `Drawer.Root` 上下文内部，禁止再次放到 Root 外导致 Base UI `DialogRootContext` error。
- 处理 safe area、软件键盘 inset、reduced-motion 和 iOS visual viewport。
- Filter Sheet 默认采用“临时选择 → 完成后一次 Apply”，避免列表在用户设置过程中持续重排。
- 危险操作仍复用原业务确认链；UI 重构不得绕过已有 confirmation / permission / validation。

## Icon Contract

- 产品业务图标默认使用 `lucide-react`，保持同一线性语言和接近一致的 stroke weight。
- Mascot / NUBBI 属于品牌资产，是普通图标规则的唯一主要例外。
- 不在普通导航中混用彩色自定义 SVG 与 Lucide 图标。
- 一个 icon 必须有明确 visual box；父容器不得小于图标本体。
- 提交前检查：`hit box / layout box / SVG size / baseline` 四者是否一致。

## 响应式代码组织

复杂交互差异不要塞进一个巨大 `isMobile ? ... : ...` 组件。

优先结构：

```text
Shared controller / actions
├─ Desktop Presenter
└─ Mobile Presenter
```

例如：

```text
NoteLibrary
├─ Desktop NoteLibraryTable + Toolbar
└─ MobileNoteLibrary

FileManager
├─ Desktop FileList + drag/drop toolbar
└─ MobileFileManager
```

简单视觉差异可使用 Tailwind responsive utility；导航、选择模式、Sheet/Popover 等行为差异应拆 Presenter 或 responsive component。

## 交互与可访问性

- 所有图标按钮必须有 `aria-label`。
- 复选框需保留全选、半选、单选及可访问名称。
- 中文输入组合期间 Enter 不提交；重命名保留 Enter / blur 提交与 Escape 取消，避免 Enter 后 blur 二次提交。
- 加载按钮禁止重复触发并提供 `aria-busy`。
- Portal / Sheet / Dropdown 点击不得冒泡触发行打开或选择。
- 动效支持 `prefers-reduced-motion`。
- iOS/Android 安全区、软件键盘与 `100dvh` 行为必须纳入 Mobile 验收。
- Mascot 若作为纯品牌装饰，应使用合适 alt 或 `aria-hidden`，避免重复朗读品牌名。

## UI 变更 Review Gate

**UI 相关变更必须先 review，再提交 / 写入远端。**

使用直接写 GitHub 的工具时没有本地 staging，必须在调用写操作前完成 pre-write static review：

1. 核对用户已确认的产品目标、品牌方向与现有 controller / business semantics。
2. 检查 Desktop 与 Mobile 是否走正确 interaction model。
3. 检查品牌资产是否仍为已确认 Mascot，是否出现第二套 Logo。
4. 检查 icon geometry、触控目标、文字溢出、safe area、hover 依赖、focus 和 destructive flow。
5. 确认 patch 不新增另一套主题 / 基础组件目录 / 任意色值 / 不可工作的假功能。
6. 再进行文件写入并保留小而清晰的 commit。
7. 写入后运行 client lint / build / 类型相关检查及 Preview 部署。
8. **Build / Deploy 成功不等于视觉验收通过。** 最终 UI 必须经过实际浏览器 / 设备交互验收；没有真实渲染证据时只报告静态 review 与 CI 状态。

## 完成前自查

- Logo、favicon、Sidebar、Auth 使用同一品牌资产。
- 没有重复或错误尺寸的 icon wrapper。
- Mobile 关键操作不依赖 hover，主要热区符合触控 contract。
- Bottom Nav、Header、Sheet 和 Selection Mode 不争夺同一屏幕空间。
- Desktop Sidebar、toolbar、drag/drop 未被 Mobile 重构意外破坏。
- Sidebar 导航保持中性，不因对象色变成彩色菜单。
- 所有颜色来自语义 Token；主按钮文本对比度、focus ring、浮层层级清晰。
- Home 没有不可工作的搜索、AI、便签或新建文件夹快捷入口。
- lint / build / Preview 状态单独记录；不要用其中任何一项替代视觉验收。

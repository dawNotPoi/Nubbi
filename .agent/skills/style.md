# 样式约定

## 产品视觉方向

Nubbi 使用 **Warm Neutral + Clear Blue**，目标是内容优先、低干扰、长期使用舒适的知识工作区，而不是蓝紫 SaaS Dashboard。

- 大面积界面由白色与暖中性色负责：页面、侧栏、hover、selected、边框和次级文字。
- 蓝色只用于明确意图：主动作、链接、focus、checked control 和少量状态提示。
- Hover、Selected、Pressed、Focus 必须是不同语义，不得用一个蓝色背景同时承担所有状态。
- 不新增大面积蓝紫、渐变、强发光、高饱和卡片墙、过度圆角或营销页视觉。
- 当前颜色、阴影和字体的唯一数值来源为 `client/src/theme.css`；业务组件不得复制另一套 hex/rgb 常量。

## Typography

- UI 使用 `--font-ui` 定义的 System UI 字体栈，中文依赖系统中文字体回退。
- 常用字重只使用 400 / 500 / 600；除非内容本身有明确排版需求，不新增 700+ 的 UI 字重。
- Desktop 常规 UI 以 14px 为基准；Mobile 核心导航、列表标题和 Sheet 行通常为 15px。
- 正文与编辑器优先保证阅读行高，不用紧凑 Dashboard 行高套中文长文本。
- 不全局使用负 letter-spacing；仅大标题在已验证情况下轻微收紧。

## 主题与语义 Token

- `client/src/theme.css` 是颜色、字体、阴影等视觉 Token 的唯一来源。
- `client/tailwind.config.js` 将语义 Token 映射为 Tailwind 工具类。
- `client/src/styles/primitives.css` 维护 Base UI 基础控件状态和浮层动效。
- 新样式优先消费语义 Token，不在业务页面使用 Tailwind 默认色板模拟主题色。

| 语义 | 优先消费 |
|---|---|
| 页面 / 内容 / 侧栏 | `bg-canvas` / `bg-surface` / `bg-sidebar` |
| 正文 / 次级文字 | `text-text-primary` / `text-text-muted` / `text-text-subtle` |
| Hover / Selected | `bg-bg-hover` / `bg-bg-selected` |
| 控件边框 | `border-border-button` / `border-border-button-hover` / `border-border-row` |
| Brand | `--brand` / `--brand-soft` |
| Solid Primary | `--primary` / `--primary-hover` / `--primary-active` / `--primary-foreground` |
| Focus | `--focus-border` / `--focus-ring` |
| 危险动作 | `--danger-bg` / `--danger-hover` / `--danger-text` |
| 业务状态 | `--status-*-bg` / `--status-*-text` |

## 基础组件架构

```text
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
- Ant Design 处于迁移期兼容层：现有复杂 Select、Empty、通知、确认和未迁移业务可继续使用，但新基础控件不要新增 AntD 依赖。
- `component/UI/` 是旧兼容区，不新增与 `components/ui` 重复的基础控件。

## Desktop 与 Mobile 是两套 Interaction Model

共享数据、controller、route contract、Design Token 和基础能力；**不要求共享导航、布局和操作暴露方式**。

### Desktop

- Sidebar + Content 是主结构。
- 高频工具可使用 compact toolbar、Dropdown / Popover、hover reveal 和拖拽。
- Sidebar 收起后可使用边缘唤回；展开时收起入口位于 Sidebar 自身，不在 Header 放空 hit target。
- Desktop 信息密度高于 Mobile，但仍保持暖中性背景和克制边框。

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
- 处理 safe area、软件键盘 inset、reduced-motion 和 iOS visual viewport。
- Filter Sheet 默认采用“临时选择 → 完成后一次 Apply”，避免列表在用户设置过程中持续重排。
- 危险操作仍复用原业务确认链；UI 重构不得绕过已有 confirmation / permission / validation。

## Icon Contract

- 产品图标默认使用 `lucide-react`，保持同一线性语言和接近一致的 stroke weight。
- 不在普通导航中混用彩色自定义 SVG 与 Lucide 图标，除非该图明确属于品牌资产。
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

## UI 变更 Review Gate

**UI 相关变更必须先 review，再提交 / 写入远端。**

使用直接写 GitHub 的工具时没有本地 staging，必须在调用写操作前完成 pre-write static review：

1. 核对用户已确认的产品目标与现有 controller / business semantics。
2. 检查 Desktop 与 Mobile 是否走正确 interaction model。
3. 检查 icon geometry、触控目标、文字溢出、safe area、hover 依赖、focus 和 destructive flow。
4. 确认 patch 不新增另一套主题 / 基础组件目录 / 任意色值。
5. 再进行文件写入并保留小而清晰的 commit。
6. 写入后运行 client lint / build / 类型相关检查及 Preview 部署。
7. **Build / Deploy 成功不等于视觉验收通过。** 最终 UI 必须经过实际浏览器 / 设备交互验收；没有真实渲染证据时只报告静态 review 与 CI 状态。

## 完成前自查

- 没有重复或错误尺寸的 icon wrapper。
- Mobile 关键操作不依赖 hover，主要热区符合触控 contract。
- Bottom Nav、Header、Sheet 和 Selection Mode 不争夺同一屏幕空间。
- Desktop Sidebar、toolbar、drag/drop 未被 Mobile 重构意外破坏。
- 所有颜色来自语义 Token；主按钮文本对比度、focus ring、浮层层级清晰。
- lint / build / Preview 状态单独记录；不要用其中任何一项替代视觉验收。

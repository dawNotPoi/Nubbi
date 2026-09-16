# 样式约定

## 本轮已确认的方向

- Periwinkle Light：明亮近白环境、极浅暖灰侧栏、蓝紫主强调色、小面积 pastel 状态色。
- 以 `dev/out` 的现有 NoteLibrary 布局和交互为准；不引入卡片墙、三栏编辑器、纸张隐喻或营销页结构。
- 本阶段是渐进式基础控件迁移，不升级 Tailwind，不更换状态管理，不改业务控制器。

## 主题唯一来源

- 颜色及浮层阴影读取 `client/src/theme.css`，本说明不重复维护色值。
- `client/tailwind.config.js` 将语义 Token 映射为工具类。
- `client/src/styles/primitives.css` 负责 Base UI 状态样式，经 `index.css` 的 CSS import 合并，以兼容 Tailwind 4.3 的 `@layer components`。
- 业务文件不得新增 hex/rgb、库默认调色板或另一套主题配置。
- 编辑器内容颜色、图片与已有业务资产不在本次迁移范围内。

| 用途 | 优先消费 |
|---|---|
| 页面/内容/侧栏 | `bg-canvas` / `bg-surface` / `bg-sidebar` |
| 文本 | `text-text-primary` / `text-text-muted` / `text-text-subtle` |
| 悬停/选择 | `bg-bg-hover` / `bg-bg-selected` |
| 控件边框 | `border-border-button` / `border-border-button-hover` |
| 主动作 | `--accent-border` / `--accent-hover` / `--accent-active` / `--accent-contrast` |
| 焦点 | 清晰可辨的 `--accent-text` 轮廓和 `--focus-ring` 辅助染色 |
| 状态 | `--status-inbox-*` / `--status-active-*` / `--status-archived-*` / `--status-published-*` |
| 危险动作 | `--danger-bg` / `--danger-hover` / `--danger-text` |

## 组件选型与迁移边界

| 场景 | 方案 |
|---|---|
| 新按钮、输入框、复选框、下拉菜单 | `src/components/ui/` 的项目自有封装，交互底座为 Base UI |
| 复杂多选 Select、现有 Empty/通知/确认弹层 | 本阶段保留 AntD |
| 已有 Dialog/Popover | 保留 `src/component/UI/` 的堆叠实现，单独安排迁移 |
| 图标 | lucide-react |
| 布局、响应式 | 当前 Tailwind 4.3 utility |

- 不在 feature 页面直接引入 Base UI 重新写一套视觉；复用 `components/ui`。
- 不执行 shadcn init 覆盖已有 CSS；组件采用 shadcn 风格的自有源码组织，并按当前工具链手动适配。
- `component/UI/` 为兼容区，不新增重复基础组件。删除旧实现前必须检查调用方。
- Button 的 `asChild` 仅保留给旧调用；新菜单使用 `render={<Button ... />}`，不得嵌套 button。
- 链接保持链接语义；需要按钮外观时使用 `buttonVariants`，不套 Base UI Button 改成 role=button。
- 为防止影响未迁移页面，旧 Button/Input 的默认尺寸本阶段保留；NoteLibrary 显式使用原有 36/32/28px 控件尺寸。

## 交互要求

- 主操作与导入按钮保持原位置；不把更换组件库变成布局重设计。
- 复选框保留全选、半选、单选，且有可访问名称；选中项在鼠标移出后不能消失。
- 菜单通过 Portal 避免被列表裁剪，点击菜单项不能触发行的选择或打开；使用 Base UI 的键盘和焦点管理，不自行模拟。
- 搜索清空后保留输入框焦点；中文输入组合期间 Enter 不提交；重命名保留 Enter/blur 提交与 Escape 取消。
- 加载按钮禁止重复触发并提供 aria-busy；已有异步成功/失败逻辑不搬到基础控件。
- 动效仅改变必要的透明度/位移，支持 prefers-reduced-motion。

## 完成前自查

- pnpm 同步更新依赖与根锁文件，不手工编造 integrity。
- client lint、build、类型检查和桌面/移动浏览器交互检查分别记录；语法转译不等于类型检查或构建成功。
- 验证主按钮文本对比度、焦点可见性、浮层层级、文本溢出和触摸操作。
- 没有实际部署成功结果，不报告 Preview URL 或在线验收通过。

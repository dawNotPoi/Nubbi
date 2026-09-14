# 样式约定

## 颜色 Token（禁止 hardcode hex/rgb）

| 用途 | Tailwind class |
|------|---------------|
| 主文本 | `text-foreground` |
| 次要文本 | `text-muted` |
| 辅助文本 | `text-subtle` |
| 主色 | `text-primary` / `bg-primary` |
| 主色浅 | `bg-primary-soft` |
| 危险 / 警告 / 成功 | `text-danger` / `text-warning` / `text-success` |
| 页面背景 | `bg-background` |
| 卡片/内容区 | `bg-surface` / `bg-panel` |
| 侧边栏 | `bg-sidebar` |
| 边框 | `border-border` |
| 分割线 | `border-divider` |

## 布局

- 间距用 Tailwind scale（`p-3` `gap-4`），不写 `style={{ padding: '...' }}`
- 圆形图标按钮：`<button className="size-10 grid place-items-center rounded-full">`
- 固定宽度图标容器避免跳动：`size-10` / `size-12`
- 表单元素统一高度；操作按钮（如验证码）固定宽度 `shrink-0`，输入框 `min-w-0 flex-1`
- 滚动条：`scrollbar-thin scrollbar-thumb-border`

## 组件选用

| 场景 | 方案 |
|------|------|
| 表单 / 表格 / Select / DatePicker | antd |
| 弹窗 / 对话框 | `src/component/UI/Dialog`（内置堆叠管理） |
| 图标 | lucide-react；antd icons 仅用于 antd 组件配套 |
| 纯布局 / 间距 / 响应式 | Tailwind utility |

## 完成前自查

- 无横向溢出；图标几何居中；表单元素高度一致；移动端不破版

# 样式约定

## 颜色 Token（禁止 hardcode hex/rgb）

| 用途 | Tailwind class | 对应 hex |
|------|---------------|---------|
| 主文本 | `text-text-primary` | #37352f |
| 次要文本 | `text-text-muted` | #787774 |
| 辅助文本/图标 | `text-text-subtle` | #9b9a97 |
| placeholder | `text-text-placeholder` | #b4b4b1 |
| 行悬停背景 | `bg-bg-hover` | #f7f7f5 |
| 选中背景/标签底 | `bg-bg-selected` | #f1f1ef |
| 图标按钮悬停 | `bg-bg-icon-hover` | #e9e9e7 |
| 面板/操作栏 | `bg-bg-panel` | #fbfbfa |
| 行分隔线 | `border-border-row` | #efefed |
| 按钮/输入框边框 | `border-border-button` | #d9d7d2 |
| 按钮悬停边框 | `border-border-button-hover` | #bdbab4 |
| 工具栏边框 | `border-border-toolbar` | #e3e2df |
| 焦点环 | `ring-focus-ring` | #d3d1cb |
| 骨架屏 | `bg-skeleton` | #e6e4e1 |
| 激活态边框 | `border-accent-border` | #2383e2 |
| 激活态背景 | `bg-accent-bg` | #eef6ff |
| 激活态文字 | `text-accent-text` | #1f5f99 |
| 侧边栏 | `bg-sidebar` | #f9f8f7 |
| 状态 inbox | `bg-amber-50 text-amber-700` | — |
| 状态 active | `bg-blue-50 text-blue-700` | — |
| 状态 done | `bg-emerald-50 text-emerald-700` | — |
| 状态 archived | `bg-neutral-100 text-neutral-600` | — |
| 已发布 | `bg-purple-50 text-purple-700` | — |

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

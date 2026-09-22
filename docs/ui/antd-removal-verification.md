# AntD 全量迁移验收记录

日期：2026-09-21。分支：`refactor/ui-unification-local`。本轮未提交、未推送。

## 实现范围

- 主客户端原 AntD 使用点全部迁移至 `components/ui` 的项目自有 shadcn 风格源码层，以 Base UI 为交互底座；保留 Nubbi 主题、品牌资产和业务控制器。不是重新执行 shadcn init，也不宣称逐字采用官方 registry 源码。
- 会议、文件、笔记、回收站、编辑器、上传、账户、Token、登录及重置密码区域统一使用共享控件与反馈出口。
- 删除 AntD、Ant Design icons、cssinjs 直接依赖及锁文件对应依赖，去除主题注入与 `.ant-*` 覆盖；旧基础组件路径仅转导出共享实现。
- 补齐手机 Sheet、键盘菜单、异步确认锁；文件删除确认在账号切换和卸载时销毁，失败保留确认。登录错误使用单次中文浮动提示。44px 触控目标已覆盖 Button/Input/Select/Tabs/SheetRow，仅在 Sheet 与 Toast 的关闭键上未达标，已登记在 `rebuild-plan.md` 第 10 节。

## 静态与构建验证

- `rg -n 'antd|@ant-design|\.ant-' client/src client/package.json pnpm-lock.yaml`：零命中。
- `pnpm exec tsc -b`：通过。
- `pnpm lint`：无错误，保留 `utils/common.ts` 原有 4 条 any 警告。
- `pnpm build`：通过，仍有主包体积警告；本轮未扩展为打包拆分优化。
- `git diff --check`：通过。
- 静态 review 覆盖危险确认、账号作用域、Portal 冒泡、异步状态、手机与桌面差异、Logo/圆角/颜色契约；发现的确认框跨账号残留和快速笔记最大宽度问题已修复。

## 实际浏览器验证

使用本地开发服务与原测试后端，Chrome 已有登录会话；另用隔离的内置浏览器验证失败登录，未退出用户已有会话。

- 桌面：主页、会议创建弹窗、时长选择并取消；文件列表、行尾菜单、右键菜单、移动目标树、自身目录禁选、删除确认并取消；笔记库状态和标签菜单、已有笔记编辑器加载、封面标签页切换。
- 手机 390 × 844：无桌面 Sidebar，保留四个一级导航；文件操作 Sheet 到移动 Sheet、会议表单 Sheet、更多到 Token 管理 Sheet，内容可见且未产生页面横向溢出。验收后已恢复原视口。
- 登录：使用不存在的测试邮箱尝试登录，得到一次“邮箱或密码不正确，请重试”浮动提示，邮箱和密码输入保留，按钮恢复可操作。
- 封面入口沿用原有“添加即保存”行为，验收时短暂添加的默认封面已移除恢复无封面，正文未编辑；该笔记修改时间可能因此更新。
- 发现 Vite 长运行实例缓存了部分旧模块；已重启并强制重新预构建，复核服务返回最新无 AntD 源码。

## 未实际执行的场景

未执行真实永久删除、账号注销、Token 创建/撤销、邮件发送、OAuth 跳转、文件上传及多人音视频通话；这些路径完成静态迁移审查，不声称已完成端到端验收。未新增或修改自动化测试，未改服务端、数据库结构或用户环境配置。

## 二次静态 review（2026-09-21，迁移收尾）

在第一次验收之后又做了一轮以 diff 为对象的静态 review，结论如下。

### 发现并修复

- **创建会议开始时间约束丢失（业务回归）**：旧 `addMeeting.tsx` 用 `<DatePicker minDate={dayjs()} showTime />` 禁止过去时间；`addMeeting` 改为转发 `CreateMeetingModal` 后，表单换成原生 `datetime-local`，`min` 与提交校验都没有，可以创建过去时间的会议。已在 `CreateMeetingModal` 补回双层校验：`min = 当前时间 − 5 分钟`，提交前按同一宽限再校验；已在 `docs/meeting/PRD.md` 写入该契约与宽限理由。

### 确认不修但写入方案

- **Modal `onCancel` 语义**：核对迁移前 `component/UI/Dialog/index.tsx`，旧实现四条关闭路径（遮罩、关闭按钮、取消按钮、`onOk` 成功后）都调用 `onCancel`，当前实现与之等价，故不改行为，只在 `antd-removal-plan.md` 固化契约并加代码注释；唯一差异是 Escape 现在也会通知 `onCancel`（与其他路径口径统一）。
- **OAuth 取消提示**：取消分支原先与失败/超时共用含用户可见文案的三元表达式，而登录页按 `OAUTH_CANCELLED` 抑制提示，属于死文案。已改为独立静默返回并补注释，口径写入 `docs/auth/PRD.md`。
- 六项延后项（浮层层级坐标、移动端触控目标、`toast as message` 过渡命名、Popover 回调语义、OAuth 超时强关窗口、Tabs 函数式 `className`）已集中登记在 `docs/ui/rebuild-plan.md` 第 10 节。

### 复审命令结果

- `rg -n 'antd|@ant-design|\.ant-' client/src client/package.json pnpm-lock.yaml`：仅 `InitUploadInstantData` 一类大小写误报，无真实命中。
- `pnpm exec tsc -b`：通过。`pnpm lint`：0 error，仍为 `utils/common.ts` 原有 4 条 any 警告。`pnpm build`：通过（约 14s），仅主包体积警告。`git diff --check`：通过。
- 手写源码单文件最大 968 行（`session-coordinator.ts`），UI 组件最大 138 行（`sheet.tsx`），均在上限内。
- 旧基础组件路径（`component/UI/*`）确认为 2–3 行纯转导出，无重复实现。
- 危险操作 8 处确认框全部带 `danger`、默认焦点在取消、在途拒绝重复确认与关闭；文件删除确认句柄按 `ownerId`/卸载销毁。
- 品牌资产只有 `NubbiBrand` 一处渲染 `/brand/nubbi-mascot.webp`，Sidebar/Auth/AuthStatusScreen 与 favicon 同一资产，无第二套 Logo。
- 额外做了一项产物比对：抽取源码中 305 个任意值工具类与 34 个语义 Token 类名，逐一在 `client/dist` 产物 CSS 中按 Tailwind 转义规则匹配，未发现引用不存在 Token 的死类名（3 次疑似命中经复核均为校验脚本转义问题）。

# AntD 全量迁移实施计划

**Goal:** 将主客户端剩余 AntD 调用迁移到唯一的 shadcn/ui 源码组件层，最终移除 AntD 运行依赖。

**Architecture:** 延续 components/ui 和 Base UI 交互底座，保留 Nubbi 语义 Token。采用 shadcn 的项目持有源码模式与 Base UI 组件组合，不重新初始化主题，不复制第二套基础控件。复杂业务表单和树保留业务控制器，用共享组件重组。

**Spec:** 用户已要求全部完成；视觉与行为契约见 docs/ui/rebuild-plan.md。原计划的 AntD 迁移期兼容在本轮结束，不改认证、数据隔离、保存、上传和危险操作语义。

## 共同约束

- 只改主客户端和相关文档，不改服务端、数据库、测试文件；不提交或推送。
- 暖白暖灰、固定便签精灵、语义色、统一圆角保持不变。Desktop 与 Mobile 保留各自交互模型。
- 共享组件仅放 components/ui；旧 component/UI 基础组件调用全部收敛，允许纯转导出过渡，不保留重复实现。
- 新增注释中文，公开函数明确类型及 TSDoc；不使用 any。
- 不建设 AntD API 仿制层；调用端改用项目组件和受控 React 表单。

## 共享接口

- Button/Input/Checkbox/Sheet/DropdownMenu 使用已有组件接口。
- Select：value?: string，options: {value: string; label: string; disabled?: boolean}[]，onValueChange(value: string): void，placeholder/disabled/id/name/className/aria-label。
- Textarea：原生 textarea 属性。
- Modal 来自 components/ui/dialog：open/onOpenChange/title/children/className/showClose/maskClosable；支持 footer?: ReactNode、onCancel、onOk、okText/cancelText/confirmLoading/okButtonProps、width。业务新调用优先显式 footer。
- Modal 的 onCancel 沿用旧 `component/UI/Dialog` 契约：任何关闭（遮罩、Escape、关闭按钮、取消按钮、`onOk` 成功后的自动关闭）都会通知一次 onCancel，调用端按 onClose 语义使用。不要改成 AntD “只在用户取消时触发”；若将来要拆出独立 onClose，必须同步改全部调用点并回到本文档更新契约。
- confirmDialog 来自 components/ui/confirm-dialog：{title,content,okText?,cancelText?,danger?,onOk?:()=>void|Promise<void>,onCancel?}，返回 {destroy():void}，保留异步失败不关闭及账号切换销毁确认框能力。
- toast 来自 components/ui/toast：success/error/info/warning/loading(content: ReactNode | {content:ReactNode;key?:string;duration?:number}, durationSeconds?:number)，返回关闭函数；dismiss(key?)。业务不再依赖 useMessage/contextHolder；类型 NotificationApi = typeof toast。
- Alert、Badge、Skeleton、Spinner、Progress 等小型基础组件按真实用量补充；共享文件负责人为主代理。

## 任务与验证

- [x] 共享组件：补齐 Dialog/Confirm/Select/Tooltip/Toast 和基础状态组件；去除 AppProvider 的 AntD 注入。验证受控状态、焦点回收、Portal 冒泡、异步确认及重复点击。
- [x] 会议：component/MeetingList、views/meeting-room、features/meeting。替换日期、日历、选择、表单、提示、确认；会议时间和设备选择语义不变。
- [x] 文件与笔记：features/file、features/note、features/note-trash、views/file-manage、views/note、component/editor、component/upload、component/NoteList。保留树选择、批量操作、上下文菜单、上传进度和编辑器交互。
- [x] 账号与认证：AccountDeletionModal、ApiTokenModal、ChangeAvatarModal、UserProfile、MobileMoreSheet、SideBar、features/api-token、views/login、views/reset-password。统一浮动错误提示，消除重复错误块，保留输入和验证流程。
- [x] 整合：移除 AntD 包、CSS 覆盖和旧基础控件重复实现，检查零残留导入，完成 TypeScript/ESLint/build 与实际浏览器桌面/移动交互复核。没有实际证据的功能不宣称验收通过。

## 验收命令

```text
rg -n 'antd|@ant-design' client/src client/package.json
pnpm --dir client exec tsc -b
pnpm --dir client exec eslint . --ignore-pattern 'vite.config.ts.timestamp-*'
pnpm --dir client build
git diff --check
```

首条命令期望无运行依赖或导入，其余命令期望成功；现有 unrelated 警告单列。浏览器覆盖认证失败、弹层关闭/焦点、菜单、文件移动、会议创建时间和窄屏布局。

## 遗留问题

迁移中确认、有意延后处理的组件层与视觉层遗留（浮层层级坐标、移动端触控目标、`toast as message` 过渡命名、Popover 回调语义、OAuth 超时行为、Tabs 函数式 className）集中维护在 `docs/ui/rebuild-plan.md` 第 10 节，本文档不再重复维护清单。

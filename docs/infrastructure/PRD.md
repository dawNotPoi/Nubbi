# 基础设施模块 PRD

## 模块概述

项目的基础设施层，包含中间件、共享组件、状态管理、API 层、实时通信。所有业务模块都依赖此层。

**涵盖**: 服务端中间件/common/lib/socket + 客户端 store/api/hooks/component（共享部分）

---

## 服务端基础设施

### 中间件

| 文件 | 导出 | 用途 |
|------|------|------|
| `middleware/session.ts` | `requireAuth` | Session/JWT/API Key 解析，注入用户信息到 `req` |
| `middleware/validator.ts` | `validate`, `validateQuery`, `validateParams` | Zod schema 验证 |
| `middleware/common.ts` | `asyncHandler` | 异步错误自动捕获（替代 try-catch） |
| `middleware/common.ts` | `errorHandler` | 全局错误处理，统一错误响应格式 |

### 核心库

| 文件 | 用途 |
|------|------|
| `lib/db.ts` | MongoDB/Mongoose 连接，默认数据库 `Nubbi` |
| `lib/env.ts` | 环境变量 Zod 校验，类型安全 |
| `lib/auth.ts` | Better-Auth 完整配置 |
| `lib/email.ts` | 邮件发送服务 |
| `common/chalk.ts` | 日志颜色格式化 |

### 实时通信

仓库使用独立 `turn/` 管理 coturn。Compose 的 `meeting` profile 可单独启动 TURN；存在 `turn/.env` 时后端部署同时启动该服务。后端和 coturn 共用这份专用配置，不向 coturn 注入数据库、OAuth 等其他密钥。配置及 TLS 私钥不入库、不进入发布包，滚动替换发布目录时保留服务器现有文件。本地与生产使用同一套脚本，实际地址必须显式提供；缺少认证配置时拒绝启动。

会议连接启用 Socket.IO 15 秒短断恢复并重新认证；会议成员宽限、连接代次由会议模块维护。当前仍是单进程内存状态，不承诺跨实例或重启恢复。ICE 通过 `MEETING_STUN_URLS`、`MEETING_TURN_URLS`、`MEETING_TURN_SECRET` 配置，密钥只存在于服务端，TURN 地址与密钥必须成对提供。

| 文件 | 用途 |
|------|------|
| `socket/user-handler.ts` | 用户在线人数状态 |
| `socket/authentication.ts` | Socket Session/JWT 握手认证 |
| `socket/meeting/` | 会议室 WebRTC 信令和房间状态 |

HTTP 与 Socket CORS 只允许 `env` 中声明的可信 Origin；无 Origin 的服务端或
同源调用可继续使用。请求日志只记录脱敏后的 pathname，不记录 query string，
并遮蔽 Better-Auth 密码重置路径中的 Token。服务端 500 响应不回传内部异常消息。
生产环境仅保留 Better-Auth 警告和错误日志，认证日志中的 Token、Cookie、
验证码、密码和密钥字段统一脱敏，主消息和附加参数使用同一套脱敏规则。
`TRUST_PROXY_HOPS` 默认是 `0`；仅当服务端位于确定数量的受控反向代理后方时，
才按实际代理层数设置为 `1`–`5`，认证发码限流据此读取可信客户端 IP。
全局错误处理只接受 400–599 的数字状态码，并兼容 Better Auth 的
`statusCode`；无效状态不会直接传入 Express。会议 Socket 的 ack 和事件
payload 都执行运行时校验，遗留的跨 socket 私密转发事件已移除。

---

## 客户端基础设施

### API 层

| 文件 | 用途 |
|------|------|
| `api/request.ts` | 请求基类：自动注入 Token、401 处理、GET/POST/PUT/DELETE 封装 |
| `api/note.ts` | 笔记 API + TypeScript 类型 |
| `api/meeting.ts` | 会议 API + TypeScript 类型 |
| `api/file.ts` | 文件管理 API |

### 状态管理

| 文件 | 用途 |
|------|------|
| `store/atom/common.ts` | `sideBarOpenedAtom` — 侧边栏展开/收起 |
| `store/atom/noteAtom.ts` | 笔记全局状态（allNotes, rootNotes, children, detail, mutations） |
| `store/atom/FileAtom.ts` | 文件上传状态 |

使用 **Jotai** + **TanStack Query** 实现全局状态和服务端缓存。

### 自定义 Hooks

| 文件 | 用途 |
|------|------|
| `hooks/useAuth.ts` | 认证状态（登录/用户信息/初始化状态） |

### 共享 UI 组件

| 组件 | 路径 | 用途 |
|------|------|------|
| Header | `component/Header.tsx` | 页面顶部栏（侧边栏按钮 + 面包屑插槽） |
| SideBar | `component/SideBar/` | 左侧导航（头像、菜单、笔记树、可拖拽宽度） |
| Tree | `component/SideBar/components/Tree` | 通用树形组件 |
| Dialog | `component/UI/Dialog/` | 弹窗 |
| Popover | `component/UI/Popover/` | 浮层 |
| Image | `component/UI/Image/` | 图片（含 fallback） |
| Divider | `component/UI/Divider/` | 分割线 |

### 路由系统

| 文件 | 说明 |
|------|------|
| `Route.tsx` | 完整路由配置、ProtectedRoute、PublicOnlyRoute、AuthRouteFallback |
| `utils/routes.ts` | 路由路径常量 |

### 响应式应用壳

- `768px` 以下启用移动端壳：底部导航固定为「首页 / 笔记 / 新建 / 文件 / 更多」。
- 「更多」与页面顶部菜单共用侧滑抽屉，承载笔记树、会议、回收站和账户操作；路由切换、遮罩点击或 Escape 会关闭抽屉。
- 桌面侧栏保留宽度拖拽和持久化开关；收起后鼠标移入左侧边缘时，以带页面边距、圆角和阴影的固定宽度浮层临时出现，仅使用透明度和轻微位移动效，不触发宽度渐变或挤压正文。离开浮层后自动收回且不改变持久化状态。移动抽屉使用独立的临时 UI 状态，默认关闭。
- 页面高度使用动态视口并为系统安全区、顶部栏和底部导航预留空间；触摸设备不依赖 hover 暴露关键操作。

---

## 开发约定

### 添加新的 API 调用
1. 在 `client/src/api/` 新建文件，参考 `request.ts` 的封装
2. 定义请求/响应的 TypeScript 类型
3. 在页面组件中通过 TanStack Query 或直接调用

### 添加共享组件
1. 新的无业务基础控件统一放在 `client/src/components/ui/`。
2. 交互底座使用 `@base-ui/react`，采用 shadcn 风格的项目自有源码封装，适配 Tailwind 4.3。
3. 业务组件放在对应 `features/<module>/components/`，不把领域逻辑放进 UI 基础目录。
4. `component/UI/` 是迁移期兼容区，不新增另一套 Button、Input 或菜单。
5. 复杂 Select、既有 Dialog/Popover、通知和尚未迁移的业务继续使用原实现，不在本阶段删除 Ant Design 或 Radix 依赖。

### UI 基础控件迁移第一阶段

- 以 `refactor/ui-theme-v1` 的 NoteLibrary 为样板，不改变 SideBar、Header、标题、工具栏、表格的布局及业务控制器。
- Button、Input、Checkbox、DropdownMenu 的项目封装统一消费 `theme.css`；不重新执行 shadcn init 覆盖现有主题。
- 为保护未迁移页面，Button/Input 的旧默认尺寸与 Button 的 `asChild` 兼容入口暂时保留；NoteLibrary 显式选择 36/32/28px 原有控件尺寸。
- Checkbox 使用 `checked: boolean`、`indeterminate: boolean` 和 `onCheckedChange`。每个控件必须有可访问名称；选中的行在鼠标移出后仍显示勾选状态。
- 菜单通过 `render` 组合现有按钮，不嵌套 button；复用 Base UI 的键盘导航、Escape、焦点管理和定位，Portal 点击不得冒泡触发行选择或打开。
- 输入框保留搜索清空、原位编辑和 Enter/Escape 语义，输入法组合期间不得提前提交。
- 菜单和基础控件支持 reduced-motion；复杂标签 Select、Empty、通知与确认弹层暂留 AntD。
- 依赖版本和根锁文件必须由 pnpm 一起生成，完成全量 lint/build 和浏览器交互验收后才能标记迁移完成。

### 添加服务端中间件
1. 放在 `server/app/middleware/`
2. 导出 Express 中间件函数
3. 在 `server/app/index.ts` 的 `app.use()` 中注册

---

## 技术栈完整清单

| 层级 | 技术 | 版本约束 |
|------|------|---------|
| 运行时 | Node.js | - |
| 后端框架 | Express | 4.x |
| 数据库 | MongoDB + Mongoose | 8.x |
| 认证 | Better-Auth | 1.x |
| 验证 | Zod | 3.x |
| 实时通信 | Socket.io | 4.x |
| WebRTC | simple-peer | - |
| 前端框架 | React | 19.x |
| 构建 | Vite | 5.x |
| 状态管理 | Jotai + TanStack Query | - |
| UI 库 | Base UI + Ant Design（迁移期） | 见 client/package.json |
| 样式 | Tailwind CSS | 4.3.x |
| 编辑器 | Tiptap (ProseMirror) | - |
| 路由 | react-router-dom | 6.x |
| 邮件 | Nodemailer | - |

---

## MCP 服务

- `mcp/` 是第三个 pnpm workspace，使用 TypeScript 和官方 MCP SDK。
- stdio 用于本地 Host；无状态 Streamable HTTP 用于云端 Host。
- MCP 不直连 MongoDB，只通过主服务 `/mcp-api/*` 调用业务逻辑。
- Docker Compose 中 MCP 服务监听 3100，主服务地址通过 `NUBBI_API_URL` 注入；宿主端口默认仅绑定 `127.0.0.1`，改绑其他网卡必须显式配置 `MCP_BIND_ADDRESS`。
- HTTP 对外必须经 HTTPS 反向代理，并配置允许的 Host 与 Origin。


### Tailwind v4 升级边界（2026-09-16）

- 客户端固定 `tailwindcss` 与 `@tailwindcss/vite` 为 4.3.3，通过 Vite 插件处理 CSS，不升级 Vite 或其他 workspace。
- `index.css` 使用 `@import`、显式 `@config` 和限定到客户端的源码扫描；`tailwind.config.js` 暂时保留原语义 Token、圆角和动画映射，避免一次改写所有页面。
- 移除客户端旧 PostCSS 配置、Autoprefixer 和第三方 scrollbar 插件；滚动条工具类由 Tailwind 4.3 提供，现有原生 CSS 滚动条外观仍保留。
- AntD 置于 `antd` 层，共享控件置于 `components` 层，utility 位于最后；编辑器独立 CSS 用 `@reference` 获得原有 `@apply` 上下文。
- `tailwind-compat.css` 临时保留旧细阴影、模糊、透明轮廓和裸圆角；不要继续扩充历史兼容类，新控件使用明确语义样式。
- 浏览器最低目标变为 Safari 16.4、Chrome 111、Firefox 128；旧浏览器不在本次 v4 验收范围。
- 不改 NoteLibrary 表格列宽、侧栏、业务事件、接口或数据模型。尚需实际浏览器确认与预览部署；构建成功不能代替视觉验收。

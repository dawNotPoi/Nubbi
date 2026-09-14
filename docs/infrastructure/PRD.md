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
1. 放在 `client/src/component/` 下
2. UI 基础组件放 `component/UI/`
3. 业务组件按模块放 `component/<module>/`
4. 使用 Tailwind CSS + Ant Design，遵循界面样式规范

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
| 前端框架 | React | 18.x |
| 构建 | Vite | 5.x |
| 状态管理 | Jotai + TanStack Query | - |
| UI 库 | Ant Design | 5.x |
| 样式 | Tailwind CSS | 3.x |
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

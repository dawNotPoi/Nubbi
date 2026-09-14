# 基础设施模块 PRD

## 模块概述

项目的基础设施层，包含中间件、共享组件、状态管理、API 层、实时通信。所有业务模块都依赖此层。

**涵盖**: 服务端中间件/common/lib/socket + 客户端 store/api/hooks/component（共享部分）

---

## 服务端基础设施

### 中间件

| 文件 | 导出 | 用途 |
|------|------|------|
| `middleware/session.ts` | `requireAuth` | Bearer Token 解析，注入用户信息到 `req` |
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
| `socket/userHandler.ts` | 用户在线状态、私密消息 |
| `socket/P2PHandler.ts` | 会议室 WebRTC 信令 |

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

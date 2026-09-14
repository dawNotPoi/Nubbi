# 认证模块 PRD

## 模块概述

用户认证系统，支持邮箱密码登录、第三方 OAuth、验证码机制、密码重置、账号注销。

**服务端**: `server/app/routes/auth.ts` + `server/app/lib/auth.ts` + `server/app/lib/email*.ts`
**客户端**: `client/src/views/login/` + `client/src/views/reset-password/` + `client/src/hooks/useAuth.ts`

---

## 认证方式

| 方式 | 状态 | 实现 |
|------|------|------|
| 邮箱 + 密码 | ✅ 已实现 | Better-Auth email/password |
| 邮箱 + 验证码 | ✅ 已实现 | Nodemailer 发送 6 位验证码 |
| GitHub OAuth | ✅ 已实现 | Better-Auth GitHub provider |
| Google OAuth | ✅ 已实现 | Better-Auth Google provider |
| 长期 API Token | ✅ 已实现 | Better-Auth apiKey plugin |

### API Token 用途预设

- **通用 API**：兼容现有外部程序集成；历史无 permissions 的 Token 继续保留完整业务访问能力。
- **MCP Agent**：固定授予 Note 的 read/create/update/move/archive/trash/restore，不授予 publish、purge、file、meeting。
- 两类 Token 共用 `nb_` 前缀、哈希存储、过期、限流、列表和撤销机制；明文仅在创建时返回一次。
- MCP Agent Token 由 `POST /auth/api-key/mcp` 创建，该接口只接受真实 Session/JWT，不接受 API Token。
- Better Auth 的外部 API Key create/update 请求禁止携带服务端专用 `userId`，防止绕过 Session 代其他用户创建或修改 Token。
- 账号注销会先撤销该用户全部 API Key；API Key 鉴权同时验证所属用户仍存在，避免已注销账号产生孤儿数据。
- JWT 鉴权同样确认用户仍存在；MCP Token 创建端点仅接受受信浏览器 Origin 或无 Origin 的服务端调用。
- MCP 身份同时由不可变的权限指纹兜底识别，即使历史 Token 的 metadata 曾被降级，也不能转而调用旧写路由。

---

## API 端点

### 注册
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/auth/register/send-code` | 发送注册验证码到邮箱 |
| POST | `/auth/register/email` | 邮箱注册（需验证码） |

### 邮箱验证
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/auth/email/verify-by-code` | 验证邮箱 |
| POST | `/auth/email/resend-verification-code` | 重发验证码 |

### 密码
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/auth/password/reset/send-code` | 发送密码重置验证码 |
| POST | `/auth/password/reset-by-code` | 用验证码重置密码 |

### 账号
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/auth/account/delete/send-code` | 发送注销验证码 |
| POST | `/auth/account/delete/confirm` | 确认注销 |

### Better-Auth 内置
| 方法 | 路径 | 说明 |
|------|------|------|
| ALL | `/api/auth/*` | Better-Auth 自动处理（登录、session、OAuth 回调等） |
| POST | `/auth/api-key/mcp` | 创建固定权限的 MCP Agent Token |

---

## 核心库文件

| 文件 | 职责 |
|------|------|
| `server/app/lib/auth.ts` | Better-Auth 配置（providers、session、database） |
| `server/app/lib/email.ts` | 邮件发送服务 |
| `server/app/lib/emailVerification.ts` | 邮箱验证码生成/校验 |
| `server/app/lib/passwordReset.ts` | 密码重置码生成/校验 |
| `server/app/lib/registerVerification.ts` | 注册验证码 |
| `server/app/lib/accountDeletionVerification.ts` | 注销验证码 |
| `server/app/lib/env.ts` | 环境变量（含邮件、OAuth 密钥等） |

---

## 客户端页面

### 登录页 `/login`
- `client/src/views/login/` — 邮箱登录、注册表单、OAuth 按钮

### 密码重置 `/reset-password`
- `client/src/views/reset-password/` — 邮件验证码重置密码

---

## 客户端核心 Hook

### `useAuth`
- 路径：`client/src/hooks/useAuth.ts`
- 提供：`isAuthenticated`, `hasAccessToken`, `initialized`, `sessionPending`, `user`
- 用途：ProtectedRoute 和 PublicOnlyRoute 依赖此 hook 判断登录状态

---

## 路由守卫

| 组件 | 路径 | 行为 |
|------|------|------|
| `ProtectedRoute` | `client/src/Route.tsx` | 未登录 → 重定向到 `/login` |
| `PublicOnlyRoute` | `client/src/Route.tsx` | 已登录 → 重定向到 `returnTo` 或 `/home` |
| `AuthRouteFallback` | `client/src/Route.tsx` | 认证状态加载中 → 显示 Spin |

---

## 可复用组件

| 组件 | 路径 | 用途 |
|------|------|------|
| AuthCodeForm | `component/auth/AuthCodeForm.tsx` | 验证码输入表单 |
| AccountDeletionModal | `component/AccountDeletionModal.tsx` | 账号注销确认弹窗 |

---

## 中间件

| 文件 | 导出 | 用途 |
|------|------|------|
| `server/app/middleware/authentication.ts` | credential helpers | 解析并验证 Session、JWT、API Key 与所属用户 |
| `server/app/middleware/session.ts` | `requireAuth`、scope guards | 执行路由权限决策并注入类型化 auth context |

所有 `/note`、`/file`、`/meeting` 等业务路由均使用 `requireAuth` 中间件。

---

## 如何开发新功能

### 添加新的 OAuth Provider
1. 在 `server/app/lib/auth.ts` 添加 provider 配置
2. 在 `.env` 添加对应的 CLIENT_ID 和 CLIENT_SECRET
3. 在 `server/app/lib/env.ts` 的 zod schema 添加新字段
4. 在登录页添加 OAuth 按钮（参考现有 GitHub/Google 按钮）

### 添加新的验证场景
1. 参考 `server/app/lib/emailVerification.ts` 创建新的验证工具
2. 在 `server/app/routes/auth.ts` 添加对应的 send-code 和 verify 端点
3. 确保验证码有 TTL 和重发限制

---

## 依赖关系

- 被所有业务模块依赖（认证是入口）
- 依赖 `lib/email.ts`（发送邮件）
- 依赖环境变量 `env.ts`

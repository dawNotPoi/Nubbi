# 认证模块 PRD

## 模块概述

用户认证系统，支持邮箱密码登录、第三方 OAuth、验证码机制、密码重置、账号注销。

### 产品身份与资源隔离边界（2026-09-21 已确认）

- 系统支持多个账号，所有账号均为同一种普通用户身份；不设置系统管理员、角色分级或权限配置后台。
- 每个用户独立使用自己的资源，服务端必须检查资源归属，不能以“不需要角色权限”为由移除跨账号隔离。
- 会议主持人与参与者是会议内职责，API Key/MCP scope 是凭证访问限制，均继续保留；现有公开发布与签名分享沿用独立访问策略。
- 本轮将统一登录状态、会话恢复、续期、退出和资源隔离实现，不改变已有账号数据与 UI 品牌风格。
- Better Auth 1.7.5 的代码适配与隔离阶段 0 验收已完成，旧密码、Session、JWT/JWKS、普通 Key/MCP Key 及验证码桥接均有虚构数据证据。真实数据库迁移、真实 SMTP/OAuth 与生产部署仍未获验收或授权，不能把隔离通过视为生产升级完成。
- 详细目标见 [认证、会话与资源隔离重构设计](./auth-session-isolation-design.md) 和 [流程图](./auth-session-isolation.excalidraw)。用户已批准执行，阶段 0 升级实施中；下文现有 Hook/API 描述不代表会话协调层已迁移。

**服务端**: `server/app/routes/auth/` + `server/app/controller/auth/` + `server/app/services/auth/` + `server/app/lib/auth.ts`
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
- MCP Agent Token 只能通过 `/mcp-api` 访问 Note；普通 `/note` 路由会拒绝该身份，避免绕过 Agent 子树与字段策略。
- 自定义 JSON 端点统一由类型化路由注册器解析 Zod Schema；Route 不直接访问 Model 或编排账号清理。
- 账号注销由 Auth Service 统一清理 Note、Summary、Tag、Image、Meeting、评论、文件、上传任务和认证集合。
- 注销开始后拒绝该账号的新写请求，并等待当前进程内已进入的 HTTP/Socket 写操作完成后再清理，避免并发写回已删除数据。
- Better Auth 的认证写入口与 Session/Account 数据库 Hook 使用同一注销 tombstone；注销开始时主动断开该用户现有 Socket。
- 密码重置成功后撤销该用户既有 Session；短期 JWT 最长继续存活 15 分钟。

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

所有 6 位验证码每次签发最多允许 5 次失败尝试；失败计数必须使用数据库
原子递增，达到上限后立即作废，避免并发请求覆盖计数。
公开发码入口还共享进程级来源地址与服务总量限流，防止轮换邮箱消耗 SMTP；
邮箱维度的 60 秒冷却仍由验证码业务层执行。

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
| `server/app/controller/auth/` | 注册、邮箱、密码、账号、头像和 API Key 用例 |
| `server/app/services/auth/account-deletion.ts` | 跨领域账号数据清理 |

阶段 0 的迁移命令、隔离证据、回退边界与真实环境授权清单见
[`better-auth-upgrade-runbook.md`](./better-auth-upgrade-runbook.md)。阶段 A–D 的本地实现与隔离验证结果见 [`auth-refactor-verification.md`](./auth-refactor-verification.md)；真实数据库尚未迁移。

### 客户端统一会话协调层（阶段 A / Task 1）

- `client/src/features/auth/model/session-coordinator.ts` 是浏览器进程内唯一可写会话来源；UI 只读取 `status/user/generation/operation/error/initialized`，token 不进入 UI 快照。
- Session/access token 与 JWT 仅保存在协调器私有内存。每次 Provider 调用捕获发起代次，`set-auth-token` / `set-auth-jwt` 只有在响应代次仍匹配时才能提交；JWT 只是请求凭证，不构成第二份登录状态。
- `bootstrap`、刷新与 JWT 续期在同一代次共享一个在途请求，认证读取使用 10 秒超时；新鲜 JWT 不额外读取会话，过期 JWT 通过同一恢复入口刷新。
- 邮箱登录同步取得操作锁，成功后仍通过协调器做一次受控会话确认；OAuth 发起只发布 `redirecting`。只有用户与可用 Session/access token 同时存在时才发布 `authenticated`。
- 身份变化先提升 generation 并使旧响应失效。退出开始即清空本地身份、发布 `anonymous` 并回到登录页；远端确认前禁止新的登录，失败通过通知与重试入口处理，不恢复旧身份。退出意图保存在当前标签页，刷新后继续退出。
- 邮箱登录、OAuth、退出和账号注销共用 Cookie mutation 串行门槛；请求超时会先中止底层 fetch、等待其落定并受控确认 Cookie 会话，确认完成前不允许下一次身份 mutation。OAuth 仅接受 `http:` / `https:` 跳转地址，且只在原 generation 仍有效时导航一次。
- 业务请求收到响应时先核对捕获的 userId/generation；旧账号的晚到 401 抛出 stale-generation 错误，不刷新或失效当前账号。账号注销在途不提供受保护凭证，明确 4xx 与 transport-indeterminate 分别处理。
- 路由、登录、`useAuth` 与业务请求已正式接入协调器；`client/src/utils/auth.ts` 只保留实际调用的统一导出和派生 `useSession`，不持有第二份身份。零调用兼容包装与无作用 token setter 已删除。
- 私有查询按账号生成 key；身份切换先取消旧请求，再清空缓存、上传显示状态并断开 Socket/Peer/media。上传持久记录绑定 owner，跨标签只广播无敏感数据的身份变化通知。
- 普通后台会话刷新暂时失败时，仍新鲜且未被服务端拒绝的 JWT 保留身份；首次恢复与已拒绝凭证显示不可用及重试；退出确认失败仍停留登录页并提供重试。
- 服务启动只检查认证索引与 API Key 迁移状态；缺失时停止并提示维护命令，不自动迁移真实数据库。

Better Auth 的账号关联配置只声明在 `account.accountLinking`；认证日志同时按
字段名和字符串内容清理 Cookie、Bearer、JWT、API Key、验证码和密码。

开发环境允许 `localhost`、`127.0.0.1` 和 `::1` 使用实际启动端口访问认证
接口，兼容 Vite 在默认端口被占用后切换端口；生产环境仍只信任
`CLIENT_URL` 和 `BETTER_AUTH_URL` 配置的精确 Origin。

---

## 客户端页面

### 登录页 `/login`
- GitHub 桌面登录使用独立窗口；移动端或弹窗被拦截时沿用整页跳转，Google 保持不变。轻量 `/oauth-callback.html` 只通知流程结果，不传用户或 token；使用随机标记隔离的同源 BroadcastChannel，不依赖跨站跳转后 opener 的存续，原页面校验 origin 与标记，再通过唯一协调器确认会话。取消恢复按钮，失败与超时使用 toast；保留服务端 state/PKCE 和账号关联校验。
- `client/src/views/login/` — 邮箱登录、注册表单、OAuth 按钮
- OAuth 取消授权按静默返回处理：协调器只返回 `OAUTH_CANCELLED`，不发布可见错误，登录页按该错误码抑制 toast；取消不改变当前登录状态，失败与超时仍提示。禁止把取消改成「未完成」类错误提示，也不要保留两套文案。
- 登录卡片提供同级的 Google / GitHub 图标加文字按钮，复用现有 `useAuth` 和 Better Auth OAuth 流程，不新增认证 SDK。
- 发起第三方登录时显示对应渠道的等待状态，阻止重复点击和同时提交邮箱登录；失败后用单次浮动提示（toast）说明并恢复重试，不在卡片内追加错误块。
- 成功回跳沿用校验后的 `returnTo`；用户取消或 OAuth 回调失败沿用现有错误回跳处理，不改变账号关联策略。
- 客户端不保存 OAuth 密钥。服务端配置 `AUTH_GOOGLE_ID`、`AUTH_GOOGLE_SECRET`、`BETTER_AUTH_URL` 和 `CLIENT_URL` 后重启。
- 本地授权回调为 `http://localhost:4000/api/auth/callback/google`；线上登记实际认证服务的 HTTPS 地址加 `/api/auth/callback/google`，必须与 Google 控制台完全一致。
- 配置和真实 Google 授权登录需单独验收；按钮接入不代表 OAuth 控制台配置已完成。
- 认证卡片采用已确认的「欢迎便签」方向：暖白纸面、左对齐欢迎文案与固定便签精灵，精简无功能的折角和短线装饰；桌面保留左侧品牌场景并降低标语重量，移动端在卡片标题区显示 NUBBI 字标。
- 登录页 Google / GitHub 并排呈现，邮箱为主表单，忘记密码入口与密码标签同排；登录、注册、验证及重置共用标题与卡片样式，沿用认证流程。
- 短屏通过卡片滚动保留说明和操作；主要按钮至少 44px，输入框 48px，减少动态效果偏好下关闭过渡。
- OAuth 错误提示位于欢迎区下方、登录入口之前，短屏回跳后无需滚动到卡片底部即可理解失败原因并重试；密码找回保留 44px 热区，不以加高标签行换取点击范围。
- 小字号说明和占位文字使用 `theme.css` 的 `--auth-text-secondary`，仅在 AuthShell 内映射次级文字色；其在暖白纸面与白色输入框上的对比度均超过 4.5:1，不修改其他业务页的 Token 映射。

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
| `AuthStatusScreen` | `client/src/features/auth/components/AuthStatusScreen.tsx` | 使用认证页外壳显示身份确认或不可用重试，不预渲染首页骨架 |

---

## 可复用组件

| 组件 | 路径 | 用途 |
|------|------|------|
| 验证码表单 | 内联在 `client/src/views/login/index.tsx`、`client/src/views/reset-password/index.tsx` | 邮箱验证码与找回密码验证码输入（无独立组件文件） |
| AccountDeletionModal | `client/src/component/AccountDeletionModal.tsx` | 账号注销确认弹窗 |

---

## 中间件

| 文件 | 导出 | 用途 |
|------|------|------|
| `server/app/middleware/authentication.ts` | credential helpers | 解析并验证 Session、JWT、API Key 与所属用户 |
| `server/app/middleware/account-mutation.ts` | `trackAuthenticatedMutation` | 跟踪认证写请求并与账号注销互斥 |
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
2. 在 `server/app/routes/auth/` 添加 Schema 和类型化路由声明，并在 `server/app/controller/auth/` 实现用例
3. 确保验证码有 TTL 和重发限制

---

## 依赖关系

- 被所有业务模块依赖（认证是入口）
- 依赖 `lib/email.ts`（发送邮件）
- 依赖环境变量 `env.ts`

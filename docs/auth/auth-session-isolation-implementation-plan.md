# 认证会话与资源隔离 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. 项目禁止新增测试文件、自动提交和真实数据库写入的规则优先于技能模板。

**Goal:** 在 Better Auth 1.7.5 基线上完成唯一会话快照、账号代次隔离、受控请求恢复、客户端生命周期清理、服务端凭证解析与资源归属审计，并给出可显式执行的认证索引方案。

**Architecture:** 客户端以单例 session coordinator 作为用户、会话状态和凭证的唯一权威，所有 UI、请求、缓存、上传和 Socket 都绑定同一账号代次。服务端把 Session/JWT/API Key 解析收拢到认证领域服务，HTTP 与 Socket 只做传输适配；业务模块继续在自身领域执行 owner/分享/会议/MCP 规则。真实数据库索引只提供默认只读检查与显式 apply，不在启动或开发时偷偷写入。

**Tech Stack:** React 19、Better Auth 1.7.5、TanStack Query、Jotai、React Router、Express、MongoDB/Mongoose、Socket.IO、TypeScript。

**Spec:** `docs/auth/auth-session-isolation-design.md`。阶段 0 已在 `docs/auth/better-auth-upgrade-plan.md` 完成；本计划实现阶段 A–D，不重复升级依赖。

**收尾状态（2026-09-21）：** Task 1–6 本地代码均已落地；分任务审查通过，最终运行结果与明确未覆盖项见 [验收记录](./auth-refactor-verification.md)。下方组合验收项若包含未实测的设备/第三方场景仍保留未勾选，不代表对应实现未完成；不得为勾满清单伪造验收。无 commit/push/真实数据库写入。

## Global Constraints

- 多个账号、同一种普通用户身份；不新增管理员、角色、组织、租户或权限后台。
- 保留邮箱、Google/GitHub、验证码、密码重置、账号注销、分享、会议和 MCP 现有业务语义。
- 客户端只有一份可写会话快照；Session 决定身份生命周期，JWT 仅是业务请求凭证。
- 身份变更提升 generation；旧恢复、旧请求、旧缓存、上传和 Socket 结果不得进入新账号。
- 401 只允许同账号同代次恢复一次；403/404/409/429、网络错误和 5xx 不触发登出或认证重试。
- 写请求仅在服务端明确标记“业务处理前被认证拒绝”且 body 可重放时重试；网络超时不自动重试。
- 认证恢复超时 10 秒；JWT 刷新窗口保持 2 分钟；JWT 最长 15 分钟不变。
- 不把 token、用户资料或业务数据写入 LocalStorage；跨标签页只发身份变化通知。
- UI 沿用 NUBBI Warm Neutral + Soft Semantic Accents + 固定 Mascot，不另建组件体系，不重做登录卡片视觉。
- 不创建、恢复或修改 `*.test.*`、`*.spec.*`、`test/`、`tests/`。RED/GREEN 使用 stdin 临时诊断和隔离 HTTP/浏览器验证，不写测试文件。
- 不加载真实 `.env` 启动新版服务，不连接或修改现有远程数据库；真实 OAuth、SMTP、数据库迁移、索引 apply 与生产部署均需另行授权。
- 当前分支 `refactor/auth-permissions`，在当前本地目录工作；不 commit、stage、push，不改用户的 `website/`。
- 新增/修改注释使用中文；公开导出函数、类型和组件具有中文 TSDoc，函数写明 `@param` / `@returns`；无 `any`。

---

## Task 1: 唯一会话快照与代次协调器

**Files:**
- Create: `client/src/features/auth/model/types.ts`
- Create: `client/src/features/auth/model/auth-client.ts`
- Create: `client/src/features/auth/model/session-coordinator.ts`
- Create: `client/src/features/auth/model/auth-actions.ts`
- Modify: `client/src/utils/auth.ts`（先保留兼容导出，不能形成第二份状态）
- Modify: `docs/auth/PRD.md`

**Interfaces:**
- `AuthSessionStatus = "checking" | "anonymous" | "authenticated" | "unavailable"`。
- `AuthOperation = "idle" | "signingIn" | "redirecting" | "refreshing" | "signingOut" | "deleting"`。
- `AuthSessionSnapshot` 只暴露 `status/user/generation/operation/error/initialized`，不向 UI 暴露 token。
- `AuthCredentialSnapshot` 包含 `userId/generation/version/token`，只供请求和 Socket 捕获。
- `createAuthSessionCoordinator(deps)` 产生可注入 provider/clock/broadcast 的协调器；浏览器单例导出 `authSessionCoordinator`、`getAuthSessionSnapshot`、`subscribeAuthSession`、`useAuthSessionSnapshot`。
- 同一 generation 的 `bootstrap/refresh` 共用一个 in-flight Promise；`invalidateIdentity(reason)` 先递增 generation，再使旧结果失效。

- [x] 用 stdin 纯函数诊断先证明当前行为：两个独立 `useAuth` 风格消费者会持有不同 recovered user；两个恢复入口会重复调用 provider；A 的晚到响应可在账号切换后写回。记录实际失败输出。
- [x] 定义上述类型与依赖注入接口。用户发布必须同时具备 provider user 与可用 Session/access token；JWT 可随后刷新，但不能把只有 user 或只有 token 发布为 authenticated。
- [x] 实现 coordinator：10 秒超时；同代次 single-flight；login 同步锁；响应 commit 前比较 generation；已有已认证用户临时刷新失败时保留 user 但进入 unavailable 并阻止受保护写操作。
- [x] Better Auth client 不用无代次的全局响应回调写 token；每次 provider 调用在发起处捕获 generation，并通过 `commitProviderHeaders(generation, response)` 接收 `set-auth-token/set-auth-jwt`。
- [x] 邮箱登录成功后进入 redirecting，并通过同一 coordinator 做一次受控 get-session 确认；OAuth 发起只设置 redirecting，不发布 authenticated。注册/验证后自动登录复用同一路径。
- [x] 退出先提升 generation、暂停受保护操作并通知生命周期监听者；远端成功才发布 anonymous。失败/超时发布 unavailable 与“远端会话未确认退出”，允许重试，不能仅清内存宣称成功。
- [x] `auth-actions.ts` 承接注册、验证码、密码重置、账号注销与头像更新的 provider/API 包装；`utils/auth.ts` 只做兼容 re-export 和无状态 URL 工具。
- [x] GREEN stdin 诊断至少覆盖：并发恢复只调用一次；login 重复提交一次；超时；失败不伪装登出；A→B 时 A 晚结果被拒绝；JWT 新鲜不恢复；JWT 过期同代次 single-flight；无效响应不发布 authenticated。
- [x] client `tsc -b`，自查无 token 持久化、无第二份 recovered user、无测试文件、无提交。

## Task 2: 服务端统一凭证解析与认证拒绝契约

**Files:**
- Create: `server/app/services/auth/types.ts`
- Create: `server/app/services/auth/credential-resolver.ts`
- Create: `server/app/services/auth/jwt-verifier.ts`
- Modify: `server/app/lib/auth-plugins.ts`
- Modify: `server/app/lib/auth.ts`
- Modify: `server/app/middleware/authentication.ts`
- Modify: `server/app/middleware/common.ts`
- Modify: `server/app/middleware/session.ts`
- Modify: `server/app/lib/authUser.ts`
- Modify: `server/app/socket/authentication.ts`
- Modify: `server/app/index.ts`

**Interfaces:**
- `AuthenticatedActor`、`RequestAuthContext`、`AuthMethod`、`ApiKeyContext` 归属 `services/auth/types.ts`；旧 `middleware/common` / `lib/authUser` 可 re-export 兼容但不得再解析 Session。
- `resolveAuthContext(input: { headers: IncomingHttpHeaders; allowApiKey: boolean }): Promise<RequestAuthContext | null>` 是 HTTP/Socket 共用入口。
- `verifyAuthJwt(token): Promise<Record<string, unknown> | null>` 必须按 `kid` 选择单钥，校验 issuer、audience、允许算法和 exp；未知 kid 最多强制刷新 JWKS 一次。
- 所有认证在 handler 前拒绝的 401 响应设置 `X-Auth-Rejected: before-handler`；CORS 暴露此头。业务代码产生的 401 不冒充该标记。

- [x] 用 stdin 诊断先证明旧 verifier 会遍历所有钥匙且未传 issuer/audience/algorithms，旧 `getUser` 会绕过统一 resolver 再查一次 Session。
- [x] 把 JWT issuer/audience 明确设为标准化后的 `BETTER_AUTH_URL`，插件签发与 verifier 使用同一配置；保留 15 分钟过期。
- [x] 实现按 kid 缓存及单次协调刷新。缓存命中不得跳过用户仍存在检查；JWT、Session、API Key 的 method/scope 不混淆。
- [x] middleware 只解析、附加 context、映射错误和登记账号变更锁；Socket 复用 resolver，并保留 recovered socket 账号一致与注销保护。
- [x] 认证服务不可用映射 503，不伪装 401；无效/过期凭证映射 401。429 API Key 限流保持 429，MCP scope 仍为 403。
- [x] stdin RED/GREEN 覆盖：错误 issuer/audience/alg/kid；未知 kid 只刷新一次；已删除用户拒绝；Session/JWT/API Key 类型保持；before-handler 标记只出现在认证入口。
- [x] server typecheck 与隔离 provider/JWT 诊断通过；不启动真实库服务。

## Task 3: 登录、路由与业务请求统一接入

**Files:**
- Create: `client/src/features/auth/model/authorized-fetch.ts`
- Create: `client/src/features/auth/components/AuthStatusScreen.tsx`
- Modify: `client/src/hooks/useAuth.ts`
- Modify: `client/src/Route.tsx`
- Modify: `client/src/views/login/index.tsx`
- Modify: `client/src/AppProvider.tsx`
- Modify: `client/src/api/request.ts`
- Modify: `client/src/utils/auth.ts`
- Modify: `client/src/styles/auth.css` or `client/src/views/login/auth-shell.css` only if the existing semantic classes cannot express the new states

**Interfaces:**
- `useAuth()` 只订阅 `useAuthSessionSnapshot()`，不调用 Better Auth `useSession`，不持有 recovered user，不自行恢复。
- `authorizedFetch(url, init)` 在发送时捕获 `AuthCredentialSnapshot`；response 返回前再次比较 `userId/generation`，否则抛出可识别的 stale-generation 错误。
- `AuthStatusScreen` 支持 `checking` 和 `unavailable`，后者有真实 retry；登录页 checking 使用 Auth shell，不渲染首页 Sidebar skeleton。

- [x] stdin 诊断复现当前路由条件会在“已有 token、用户尚未恢复”时先展示首页 skeleton，再转登录；当前登录成功会在共享状态确认前 navigate。
- [x] `AppProvider` 只启动 coordinator bootstrap 一次；路由严格以 status 分支：checking 显示轻量身份确认，anonymous 才转登录，authenticated 才挂载业务树，unavailable 保留 returnTo 并重试。
- [x] 登录提交使用 coordinator 同步锁；按钮分别显示“正在登录”和“正在进入”，`aria-busy` 与 disabled 对应真实阶段；只有共享快照 authenticated 后导航。保持现有卡片、Mascot、圆角和 Desktop/Mobile 布局。
- [x] OAuth callback、邮箱验证自动登录、注册后返回登录均进入相同状态机；`returnTo` 使用现有站内路径校验并拒绝 `/login`、`/reset-password` 自循环及 `//` 跨站形式。
- [x] request 层区分 401/403/404/409/429/网络/5xx。401 同账号同代次最多恢复一次；旧 credential version 的 401 在已有新 token 时不再刷新。
- [x] GET/HEAD 可在 before-handler 401 后重放一次；写请求仅当 `X-Auth-Rejected=before-handler` 且 body 为 string/URLSearchParams/FormData/Blob/ArrayBuffer 等可重放形状时重放。ReadableStream、网络超时和无标记写请求不重放。
- [x] 所有 fetch 都接入代次 AbortSignal；退出/切换账号取消旧请求。取消和 stale-generation 不触发全局登出。
- [x] GREEN stdin 诊断覆盖并发 401 single-flight、旧 token 401、新 token 已刷新、A 请求遇到 B 登录、写请求标记/重放形状、403/404/409/429/5xx；client tsc/lint/build。
- [ ] 浏览器实际检查桌面与 390px：首次 `/home` 不出现假首页 skeleton；匿名进入登录；失败、重试、登录中/进入中、键盘 focus 与 reduced-motion 状态可用。

## Task 4: 账号作用域缓存、上传、Socket 与跨标签生命周期

**Files:**
- Create: `client/src/features/auth/model/account-scope.ts`
- Create: `client/src/features/auth/model/auth-lifecycle.ts`
- Modify: `client/src/utils/queryClient.ts`
- Modify: `client/src/features/note/model/keys.ts`
- Modify: `client/src/store/atom/note/noteAtom.ts`
- Modify: `client/src/store/atom/note/noteMutationAtom.ts`
- Modify: `client/src/store/atom/note/noteTrashAtom.ts`
- Modify: `client/src/store/atom/tagAtom.ts`
- Modify: `client/src/store/atom/meetingAtom.ts`
- Modify: `client/src/features/note/hooks/useNoteTreeQuery.ts`
- Modify: `client/src/views/note/index.tsx`
- Modify: `client/src/api/file.ts`
- Modify: `client/src/features/file/hooks/useFileManagerController.ts`
- Modify: `client/src/features/file/hooks/useFileManagerActions.ts`
- Modify: `client/src/component/upload/hooks/GlobalUpload.ts`
- Modify: `client/src/component/upload/hooks/useUploadTaskActions.ts`
- Modify: `client/src/features/upload/model.ts`
- Modify: `client/src/features/upload/session.ts`
- Modify: `client/src/component/upload/UploadLifecycle.tsx`
- Modify: `client/src/store/atom/FileAtom.ts`
- Modify: `client/src/store/atom/socketAtom.ts`
- Modify: `client/src/hooks/useP2PConnection.ts`
- Modify: `client/src/AppProvider.tsx`

**Interfaces:**
- 所有私有 Query Key 以 `["account", userId, ...domainKey]` 开头；`accountQueryKey(userId, domainKey)` 需要显式 userId，禁止隐式在模块初始化时读全局用户。
- `AuthLifecycleRegistry` 允许 Query、Jotai 上传和 Socket 注册 generation 清理；身份失效时先取消，再清空。
- `UploadSession` 增加 `ownerId`；新记录必须写 owner。无 owner 旧记录在 authenticated 后逐条向服务端查任务，只有成功且 task owner 由认证上下文确认时迁移；404/403 保留但不展示文件名，不触发登出。
- 跨标签消息只含 `{ type: "identity-changed"; sourceId; sequence }`，不含 token/user/business data。

- [x] stdin 诊断先证明现有静态 query key、无 owner 上传 localStorage、晚到 mutation callback 和 Socket 自动重连均可跨账号残留。
- [x] 查询组件从当前 `useAuth` user 明确传 ownerId 生成 key；mutation 在发起时捕获 scope，旧代次 response 由请求层拒绝，不能失效 B 的 key。
- [x] 身份变更立即 `cancelQueries`、清 Query cache、清当前 Jotai 私有任务并断开 Socket/Peer/media；仅 authenticated 新代次可重新连接或恢复上传。
- [x] 上传 session 读写按 owner 分区。遗留无 owner 会话不在登录前读；验证成功才回填 ownerId。无法确认的记录不删除服务端任务，不向别的账号显示文件名。
- [x] Socket auth callback 捕获 credential generation；身份切换销毁旧实例。会议 Peer/media 生命周期注册到清理器，旧账号不得重连。
- [x] BroadcastChannel 配合 storage-event fallback 广播匿名身份变化通知；接收方提升 generation、暂停旧业务、清理并重新确认 Cookie。忽略同 source/旧 sequence。
- [x] stdin GREEN 覆盖 A/B query key、晚到 A 请求、遗留上传 200/403/404、跨标签重复/乱序、Socket 切换；client tsc/lint/build。

## Task 5: 服务端资源隔离矩阵与缺口修复

**Files:**
- Create: `docs/auth/resource-isolation-matrix.md`
- Review/Modify when a concrete gap is proven: `server/app/routes/note/**`, `server/app/controller/note/**`, `server/app/services/note/**`
- Review/Modify when a concrete gap is proven: `server/app/routes/tag/**`, `server/app/controller/tag.ts`
- Review/Modify when a concrete gap is proven: `server/app/routes/summary/**`, `server/app/controller/summary.ts`
- Review/Modify when a concrete gap is proven: `server/app/routes/file/**`, `server/app/controller/file/**`, `server/app/services/fileAccess/**`, `server/app/services/fileManagement/**`, `server/app/services/fileUpload/**`
- Review/Modify when a concrete gap is proven: `server/app/routes/image/**`, `server/app/controller/image.ts`, `server/app/services/image/**`
- Review/Modify when a concrete gap is proven: `server/app/routes/meeting/**`, `server/app/controller/meeting/**`, `server/app/services/meeting/**`, `server/app/socket/meeting/**`
- Review/Modify when a concrete gap is proven: `server/app/routes/mcp/**`, `server/app/controller/mcp/**`
- Review only unless contract evidence requires correction: `server/app/routes/blog/**`, `server/app/controller/blog/**`, `server/app/controller/fileDelivery.ts`, `server/app/controller/fileLinks.ts`
- Modify relevant module PRD only where behavior/contract changes.

**Interfaces:**
- 矩阵每个入口记录 credential type、actor source、owner filter、not-found/forbidden contract、公开/分享/会议例外、写锁/CAS 和隔离证据。
- 私有资源缺失或他人所有统一不泄露存在性；MCP policy 拒绝仍按既有 403，公开分享按独立签名/发布状态契约。

- [x] 静态清点每个路由到 controller/service/Model 查询，标记列表、搜索、计数、详情、更新、删除、批量、父子树、移动目标、上传任务、秒传、会议成员和 Socket。
- [x] 对每个可能只按 `_id/noteId/storagePath/roomId` 查询的点，证明上游 owner/签名/房间约束或在数据库查询中加入 owner；不能用“路由已登录”替代资源归属。
- [x] 保留会议邀请/发现、博客发布、签名预览/下载等明确例外，只返回 PRD 允许字段；不把主持人变成系统管理员。
- [ ] 双账号隔离 HTTP/Socket 矩阵覆盖设计第 7 节：列表/搜索/计数/详情/修改/批量/移动/上传/分享、会议、通用 Key、MCP Key、账号注销。使用虚构隔离库，禁止真实账号/正文/Key。
- [x] 发现缺口先用 stdin/HTTP 复现 RED，再最小修复并重跑 GREEN；无缺口的模块在矩阵记录证据，不制造无意义改动。
- [x] server typecheck、MCP build；如客户端契约受影响再执行 client tsc/build。

## Task 6: 认证索引、性能测量、清理与最终验收

**Files:**
- Create: `server/app/services/auth/auth-indexes.ts`
- Create: `server/scripts/auth/manage-auth-indexes.ts`
- Modify: `server/app/services/auth/auth-database-readiness.ts`
- Modify: `server/package.json`
- Modify: `docs/auth/better-auth-upgrade-runbook.md`
- Modify: `docs/auth/auth-session-isolation-design.md`
- Modify: `docs/auth/PRD.md`
- Modify: `docs/auth/discussion.md`
- Modify/Delete only after zero callers are proven: compatibility code in `client/src/utils/auth.ts`, `server/app/lib/authUser.ts`, `server/app/middleware/session.ts`

**Interfaces:**
- `inspectAuthIndexes(db): Promise<AuthIndexSummary>` 默认只读，报告 required/missing/conflicting/duplicateRisk，不输出用户、token、key 或 URI。
- CLI 默认 dry-run；apply 要求 `--database`、匹配的 `--confirm-database`、`--backup-complete`、`--apply`，严格拒绝未知/重复/缺值参数。
- Required indexes 至少覆盖 provider Schema 的 unique/index 字段和真实认证查询：user.email unique；session.token unique、session.userId、session.expiresAt；account.userId、providerId+accountId；verification.identifier、expiresAt；apikey.configId/referenceId/key；jwks.createdAt。任何 unique apply 前先报告重复风险并零写入。

- [x] 用公开 Better Auth schema 与源码查询路径核对 specs；名称、键顺序、unique/sparse/partial/collation 做语义化比较，不再依赖对象 `JSON.stringify` 顺序。
- [x] 实现只读检查和显式 apply。启动 readiness 只检查，不创建；真实库缺索引时安全拒绝并给 runbook 指令。
- [x] 在专用 Mongo 容器创建旧/新混合虚构记录，验证 dry-run 零写、重复风险零写、apply、幂等、冲突拒绝和 startup gate；不对现有远程库 apply。
- [ ] 对隔离完整服务测量：冷启动 `/get-session`、邮箱登录到 authenticated、并发业务请求、JWT 新鲜请求。记录请求次数、服务端耗时和浏览器导航时序；目标为一次登录一次提交、同代次最多一个恢复、JWT 新鲜时额外 session 查询为零。
- [x] 清点旧 `useSession/getCurrentSession/recoveredUser`、旧 token getter、重复 session middleware 与无作用兼容导出；零调用方后删除，不能为了清理破坏公共 API。
- [x] 完整执行 server typecheck、client tsc/lint/build、MCP build、frozen install、Docker build、diff check；记录既有警告。
- [ ] 实际浏览器验收桌面与 390px：匿名、登录成功/失败、刷新、深链、unavailable/retry、退出失败反馈、A→B、跨标签通知、reduced-motion。真实 OAuth/SMTP 无凭证时明确未验收，不能伪造通过。
- [x] 完成每任务 review、整体最终 review及一次最终修复波次；最后共享在途刷新补丁由主代理直接复核和实测，未另称独立审查通过。更新设计与验收记录；原 dev 与临时隔离服务保持停止。

## 计划自查

- Spec 覆盖：阶段 A 对应 Task 1/2；阶段 B 对应 Task 3/4；阶段 C 对应 Task 5；阶段 D 对应 Task 6。
- Shape：空/单/多消费者、无 token、损坏 JWT、空上传会话、批量/子树均有诊断或矩阵。
- Scope：会话由 coordinator、资源由领域 owner、公开分享由签名/发布状态、会议由 room/member/host 规则各自裁决。
- Order：in-flight 恢复、401、mutation、OAuth callback、跨标签与 Socket 重连均携带 generation/version 并有乱序诊断。
- Lifetime：刷新与跨标签只从 Cookie 恢复；token 不持久化；上传持久化带 owner，遗留项经服务端确认。
- 项目测试文件禁令与 TDD 技能冲突已显式处理：所有 RED/GREEN 为可复现但不落盘的 stdin/HTTP/浏览器诊断。
- 未使用 TBD/TODO/“类似前项”等占位描述；跨任务接口名称和状态枚举一致。

# 登录流程 Bug 报告

> 日期：2026-06-14  
> 范围：客户端登录流程 + 服务端认证路由  

---

## BUG-001 · 密码重置冷却限制对不存在的邮箱无效 [高]

**文件**
- [server/app/routes/auth.ts:479](../../../server/app/routes/auth.ts#L479)
- [server/app/lib/passwordReset.ts:81](../../../server/app/lib/passwordReset.ts#L81)

**现象**

`/auth/password/reset/send-code` 端点在调用 `auth.api.requestPasswordReset` 之前，通过 `getPasswordResetRemainingSeconds` 检查 60 秒冷却。但该函数依赖数据库 `password_reset_codes` 集合中的记录来计算剩余时间。

当邮箱不存在时，better-auth 不会触发 `sendResetPassword` 回调，因此不会向集合写入任何记录，`getPasswordResetRemainingSeconds` 始终返回 `0`，冷却永远不会生效。

**影响**

攻击者可以无限频率向任意不存在的邮箱发起密码重置请求，冷却机制形同虚设，可用于枚举或拖垮邮件服务。

**复现**

```
POST /api/auth/password/reset/send-code  body: { email: "nonexistent@example.com" }
# 无论请求多少次，始终返回 200，无 429 响应
```

**修复思路**

在调用 `auth.api.requestPasswordReset` 之前先基于 IP 或邮箱做全局速率限制（如 express-rate-limit），不依赖数据库记录。或者统一对所有邮箱（含不存在的）记录一条占位冷却记录。

---

## BUG-002 · 重发邮箱验证码端点无任何限流 [高]

**文件**
- [server/app/routes/auth.ts:353](../../../server/app/routes/auth.ts#L353)

**现象**

`/auth/email/resend-verification-code` 端点缺少：
1. 冷却/速率限制
2. 邮箱是否存在的校验
3. 错误处理（`auth.api.sendVerificationEmail` 抛出时错误被 asyncHandler 捕获为 500，但正常路径始终返回"验证码已发送"，无论邮箱是否真实存在）

```typescript
// server/app/routes/auth.ts:353
await auth.api.sendVerificationEmail({ body: { email }, headers: req.headers });
successResponse(res, null, "验证码已发送");  // 无论成功失败都响应成功
```

**影响**

任何人可以无限次向任意邮箱地址触发邮件发送，造成邮件服务滥用和目标用户骚扰。

**修复思路**

复用 `registerVerification` / `passwordReset` 中相同的冷却校验模式，在集合中记录最后发送时间并强制 60 秒冷却。同时对 `sendVerificationEmail` 的结果做显式检查，失败时返回 500 而非假装成功。

---

## BUG-003 · 验证码端点无暴力破解防护 [高]

**文件**
- [server/app/routes/auth.ts:308](../../../server/app/routes/auth.ts#L308) — `/email/verify-by-code`
- [server/app/routes/auth.ts:505](../../../server/app/routes/auth.ts#L505) — `/password/reset-by-code`

**现象**

两个端点均使用 6 位纯数字验证码（100 万种可能），但对错误尝试次数没有任何限制。攻击者只需在验证码有效期（邮箱验证 24h、密码重置 1h）内穷举，成功率极高。

**影响**

- 邮箱验证码：攻击者可以接管他人已注册但未验证的账号
- 密码重置码：攻击者可以重置任意存在账号的密码

**修复思路**

记录每个 `(email, token)` 的错误尝试次数，超过阈值（如 5 次）后使该验证码失效，要求用户重新获取。

---

## BUG-004 · EMAIL_NOT_VERIFIED 时弹出重复错误提示 [中]

**文件**
- [client/src/views/login/index.tsx:216](../../../client/src/views/login/index.tsx#L216)

**现象**

```typescript
// client/src/views/login/index.tsx:216
if (!result.success) {
  if (result.error?.code === "EMAIL_NOT_VERIFIED") {
    setVerificationEmail(values.email.trim());
    setVerificationCode("");
    setView("verifyEmail");           // 切换到验证视图
  }
  message.error(result.error?.message || "登录失败");  // ← 仍然弹出 toast
  return;
}
```

切换到邮箱验证视图的同时，还弹出了错误 toast（内容"邮箱还没有验证，请先输入邮箱验证码完成验证。"）。验证视图本身已有描述性提示 Alert，导致用户看到两条重复信息。

**修复**

```typescript
if (!result.success) {
  if (result.error?.code === "EMAIL_NOT_VERIFIED") {
    setVerificationEmail(values.email.trim());
    setVerificationCode("");
    setView("verifyEmail");
    return;   // 切换视图后直接返回，不再弹 toast
  }
  message.error(result.error?.message || "登录失败");
  return;
}
```

---

## BUG-005 · 登录表单邮箱提交前未 trim [中]

**文件**
- [client/src/views/login/index.tsx:215](../../../client/src/views/login/index.tsx#L215)

**现象**

```typescript
// client/src/views/login/index.tsx:215
const result = await login(values.email, values.password);
```

`values.email` 直接传入，未去除首尾空格。同一文件的第 218 行已有 `values.email.trim()`，说明开发者已意识到问题，但登录提交路径遗漏了 trim。

用户若在邮箱末尾误输入空格，将收到"邮箱或密码错误"提示，实际密码正确也无法登录。

**修复**

```typescript
const result = await login(values.email.trim(), values.password);
```

---

## BUG-006 · 邮箱验证成功后回到登录页表单字段丢失 [低]

**文件**
- [client/src/views/login/index.tsx:344](../../../client/src/views/login/index.tsx#L344)

**现象**

用户登录失败（EMAIL_NOT_VERIFIED）→ 切到验证视图 → 验证成功 → `setView("login")` → 登录表单重新挂载，之前已填写的邮箱和密码被清空。

用户需要重新输入凭据才能完成登录，体验断裂。

**复现路径**

1. 输入邮箱 + 密码 → 登录
2. 收到 EMAIL_NOT_VERIFIED → 自动跳到验证视图
3. 输入正确验证码 → 验证成功
4. 回到登录视图 → 邮箱/密码为空，需重填

**修复思路**

给登录 Form 绑定 `Form.useForm()` 实例，在 `onLoginFinish` 解构时将邮箱保存到独立 state，验证成功后自动回填；或验证成功后直接调用一次登录接口而无需用户再次操作。

---

## BUG-007 · 登录成功后最多触发 6 次串行网络请求 [低]

**文件**
- [client/src/hooks/useAuth.ts:104](../../../client/src/hooks/useAuth.ts#L104)

**现象**

`login()` 内部的请求序列：

```
1. signInWithEmail()          → POST /api/auth/sign-in/email
2. refetchSession()           → GET  /api/auth/get-session
3. getConfirmedSessionUser()
   └─ delay=0   → getCurrentSession()   → GET /api/auth/get-session
   └─ delay=120 → getCurrentSession()   → GET /api/auth/get-session (仅失败时)
   └─ delay=300 → getCurrentSession()   → GET /api/auth/get-session (仅失败时)
   └─ delay=600 → getCurrentSession()   → GET /api/auth/get-session (仅失败时)
4. refetchSession()           → GET  /api/auth/get-session (confirmedSession.user 存在时)
```

在网络状况良好时，第 3 步第一次轮询（delay=0）通常即可成功，实际请求数为 4 次。但最坏情况下为 6 次串行请求，总等待超过 1 秒。

**修复思路**

`signInWithEmail` 已从响应中提取并设置了 token，后续只需调用一次 `refetchSession()` 等待会话刷新即可，无需额外的轮询确认。若确实需要容忍会话传播延迟，可将 `getConfirmedSessionUser` 的第一次等待改为在 `refetchSession` resolve 后的直接检查。

---

## BUG-008 · 账号注销请求不走 ensureAccessToken 路径 [低]

**文件**
- [client/src/utils/auth.ts:736](../../../client/src/utils/auth.ts#L736)
- [client/src/utils/auth.ts:783](../../../client/src/utils/auth.ts#L783)

**现象**

`sendAccountDeletionCode` 和 `deleteAccountWithCode` 直接使用 `fetch` + `getAuthorizedJsonHeaders()`（同步读取当前内存中的 token），而非 `request.ts` 中的 `withAuthHeaders`（调用 `ensureAccessToken`，token 缺失时可异步恢复 session）。

```typescript
// client/src/utils/auth.ts:736
const response = await fetch(`${baseUrl}/auth/account/delete/send-code`, {
  method: "POST",
  headers: getAuthorizedJsonHeaders(),   // 同步读 token，不恢复 session
  ...
});
```

若用户 token 已在内存中被清除但 session 仍有效（如页面刷新后 restoreAuthSession 尚未完成），这两个请求会以无 Token 状态发出，被服务端以 401 拒绝，且不会自动重试。

**修复思路**

改用 `authorizedFetch`（来自 `request.ts`），与其他业务 API 请求保持一致的 token 管理路径。

---

## 汇总

| ID | 标题 | 严重性 | 文件 |
|----|------|--------|------|
| BUG-001 | 密码重置冷却对不存在邮箱无效 | 高 | server/app/routes/auth.ts |
| BUG-002 | 重发验证码端点无限流 | 高 | server/app/routes/auth.ts |
| BUG-003 | 验证码端点无暴力破解防护 | 高 | server/app/routes/auth.ts |
| BUG-004 | EMAIL_NOT_VERIFIED 重复错误提示 | 中 | client/src/views/login/index.tsx |
| BUG-005 | 登录邮箱未 trim | 中 | client/src/views/login/index.tsx |
| BUG-006 | 验证成功后表单字段丢失 | 低 | client/src/views/login/index.tsx |
| BUG-007 | 登录最多触发 6 次网络请求 | 低 | client/src/hooks/useAuth.ts |
| BUG-008 | 账号注销不走 ensureAccessToken | 低 | client/src/utils/auth.ts |

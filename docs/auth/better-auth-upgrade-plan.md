# Better Auth 1.7.5 升级 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. 项目禁止新增测试文件与自动提交的约束优先于技能模板。

**Goal:** 在不写入现有远程数据库的前提下，完成 Better Auth 1.7.5 的代码适配、可审核迁移工具和隔离环境验收，为会话重构提供稳定基线。

**Architecture:** 保留 MongoDB、Session/JWT、通用 API Key 与 MCP 策略。把升级分为依赖/调用适配、数据迁移安全、隔离验收三个任务；升级 patch 与后续客户端会话重构独立。现有用户和旧 Key 的归属不能变化。

**Tech Stack:** pnpm workspace、React 19、Express、MongoDB driver 6.21.0、Better Auth / @better-auth/api-key 1.7.5、Node 24。

**Spec:** `docs/auth/auth-session-isolation-design.md`，本计划只实现第 2.1 节和迁移阶段 0；阶段 A–D 的会话/业务隔离重构继续另列计划，不宣称本子计划覆盖整个重构。

## Global Constraints

- 多个账号、同一种普通用户身份；不新增管理员、角色、组织或权限配置后台。
- 分支 `refactor/auth-permissions`，在用户指定本地目录工作，不另建 worktree。
- 不创建、恢复或修改测试文件；验证使用类型检查、lint/build、内存诊断及隔离本地 MongoDB。
- 不提交、不推送、不自动更新 changes；不动用户的 `website/`。
- 不连接现有远程库运行新版认证；本地原开发服务须在改依赖前停止。
- 不删除真实数据或旧字段，不自动执行迁移；真实数据操作另行确认。
- 中文注释，新增/修改公开函数明确类型及中文 JSDoc 的 @param/@returns；不引入 any。
- 单文件手写源码不超过 1500 行，职责跟随认证领域；不重做 UI、不改变 API Key/MCP 访问范围。
- 实际 OAuth、生产迁移无法验证时明确报告，不把类型通过视为登录验收通过。

## Task 1: 依赖与认证插件兼容适配

**Files:**
- Modify: `client/package.json`, `server/package.json`, `pnpm-lock.yaml`, `server/Dockerfile`, `.github/workflows/deploy.yml`, `.github/workflows/preview-deploy.yml`, `.github/workflows/ui-review.yml`。
- Modify: `server/app/lib/auth.ts`, `server/app/lib/auth-database-hooks.ts`, `server/app/lib/trusted-origins.ts`, `server/app/lib/apiKeyRequestGuard.ts`, `server/app/middleware/authentication.ts`, `server/app/services/auth/account-deletion.ts`, `server/app/controller/auth/api-key.ts`（有实际 API 变化时）。
- Modify: `client/src/utils/auth.ts`, `client/src/features/api-token/model.ts`, `client/src/features/api-token/hooks/useApiTokenManager.ts`（有实际响应变化时）。
- Add if needed: `server/app/services/auth/api-key-ownership.ts`（集中处理新旧归属规则，不包含数据库连接副作用）。
- Modify when required by peer resolution: 服务端现有业务源码的 Zod 导入（不包括测试文件）；server 直接依赖锁定 Zod 4.5.4，业务继续使用 `zod/v3` 保持原 V3 Schema 契约，不迁移业务验证语义。

**Interfaces:**
- 保留 `auth`、`authClient` 与现有对外导出；现有路由和成功响应不变。
- 新版 Key 的规范归属为 `referenceId`，默认配置为 `default`、类型为 `user`；冲突时拒绝，不能无条件回退到旧 userId。
- 注销清理只删除规范归属属于本人，以及无规范字段且旧 userId 属于本人的兼容记录，不能用无条件 OR 删除冲突归属。

- [x] 确认旧版本基线：服务端 typecheck、客户端 tsc；检查 dev 监听已停止。
- [x] 固定两个 workspace 的依赖为 `"better-auth": "1.7.5"`、`"@better-auth/api-key": "1.7.5"`，按正常 pnpm 安装更新根锁文件；不更新无关依赖，不执行升级 CLI 的数据库操作。
- [x] 根据新版安装源码确认插件契约，采用如下配置语义：

```ts
import { apiKey } from "@better-auth/api-key";
import { apiKeyClient } from "@better-auth/api-key/client";
// 分别位于服务端和客户端，不在一个文件跨端引用。
apiKey({ configId: "default", references: "user", enableSessionForAPIKeys: false });
```

- [x] 保留 nb_ 前缀、metadata、原限流和过期策略，适配 API Key 查询结果与列表包装；核对 Hook 参数、trustedOrigins 可选 Request、内部 adapter API 及验证后的注册流程。
- [x] 在改防越权逻辑前用内存断言复现旧 guard 对新增字段的缺口；外部 create/update 禁止用户指定 `userId/referenceId/organizationId`，禁止切换 configId（仅允许缺省或 default），update 禁止修改 metadata。只按新版端点实际可写字段增加保护，不能放开现有 MCP 策略。
- [x] 修改 Key 鉴权读取 referenceId；校验用户仍存在。核对账号清理与 create/list/delete 行为；不修改其他资源授权实现。
- [x] 将项目使用的 CI Node 与服务容器统一到 Node 24（本机 24.16.0 已可用；不修改第三方项目）。安装后记录实际 engine/peer 警告，不能吞掉警告。
- [x] 解决 Better Call 1.4 的 Zod4 peer 与旧 server Zod3 所造成的插件类型实例不一致；使用官方 `zod/v3` 兼容导出保留业务 Schema，不能通过 any 或类型断言掩盖插件不兼容。
- [x] 执行 `pnpm --filter nubbi-server typecheck`、`pnpm --filter nubbi-client exec tsc -b --pretty false`，并对 guard/列表归一化做无落盘诊断；记录失败→修复→通过证据。
- [x] 静态自查并提交报告给主 Agent，等待任务 review；不 git commit。

## Task 2: API Key 数据兼容迁移与启动门禁

**Files:**
- Create: `server/app/services/auth/api-key-migration.ts`（纯迁移规划与只读 readiness 检查）。
- Create: `server/app/services/auth/auth-database-readiness.ts`（根据实际认证配置检查必需索引，只读，不创建索引）。
- Create: `server/scripts/auth/migrate-api-keys.ts`（显式 dry-run/apply 入口，按需沿用迁移规划）。
- Modify: `server/package.json`（增加明确迁移脚本）、`server/app/lib/auth.ts`（认证服务启用前检查兼容性）。
- Create: `docs/auth/better-auth-upgrade-runbook.md`。

**Interfaces:**
- `inspectApiKeyMigration(db: Db): Promise<ApiKeyMigrationSummary>`：只读，仅返回数量，不返回 Key 哈希或用户数据。
- `ApiKeyMigrationSummary` 至少包含 `total`, `pending`, `conflicts`；pending 是缺失 referenceId/configId、可由合法旧归属安全补齐的记录，conflicts 包括空归属、字段归属冲突、非 default 配置或孤儿用户。
- 迁移保持 key、metadata、permissions、过期和限流值逐字不变，且可重复运行。

- [x] 先读新版 Schema 和查询条件；若可无损通过字段映射兼容，向主 Agent 提交证据，不自行偏离计划。
- [x] 先以内存输入验证缺字段、重复执行、冲突、孤儿、正常新记录五类规划结果；不连接远程库。
- [x] 实现默认只读 dry-run；apply 需要显式参数、明确数据库名称确认与已完成备份确认，存在冲突即在任何写入前失败。URI 来自环境且不打印，不接受日志中回显密钥。
- [x] apply 对缺失字段使用条件更新，发生并发变化立即停止并报告，不重写既有归属或 Key 哈希。不清库、不 drop 旧字段、不顺便加索引。
- [x] 启动前只读 readiness 检查：未迁移或冲突时拒绝启动并给出迁移说明，不能在启动时自动写库。
- [x] 已核实 1.7.5 MongoDB adapter 首次写入会创建显式 table-level indexes，核心表没有完整官方关闭开关。通过公开 `better-auth/db` 的 `getSchema` 和实际配置解析这部分索引，与现有索引名称、键顺序、唯一性及影响语义的选项比对；有声明但缺失/冲突时拒绝启动，不 monkeypatch 依赖。当前 bearer/jwt/apiKey 配置的 table-level indexes 为空，不能把字段 index/unique 标记误当成 adapter 会自动创建的索引，不能为了门禁额外强制新增性能索引。
- [x] runbook 写明停写窗口、备份、dry-run、apply、前后计数、旧 Key 验证、回退边界。新版新建 Key 无旧字段时不能直接降级；回退需要经验证的 owner 回填且不得恢复已经撤销的 Key。
- [x] 在任务专用 MongoDB 容器中验证 dry-run 无写入、apply 保持哈希/策略、重复运行零更新、冲突零写入、启动拒绝未迁移数据。
- [x] 静态自查并报告；不对真实库 apply、不提交。

## Task 3: 隔离集成验收与下一阶段入口

**Files:**
- Update: `docs/auth/better-auth-upgrade-runbook.md`, `docs/auth/PRD.md`, `docs/auth/discussion.md`, 本计划进度。
- 如验收发现 Task 1/2 问题，返回原任务修复，不在验收阶段偷偷改变业务契约。

**Interfaces:**
- 消费 Task 1 的新依赖/配置与 Task 2 的只读检查/迁移入口。
- 产出升级证据、未验收项与迁移授权清单；真实迁移未获授权时不启动远程库上的新版服务。

- [x] 主 Agent 创建仅绑定 127.0.0.1 的临时 mongo:7 容器，无挂载真实数据；使用独立数据库和虚构验证账号，容器属于本次任务。
- [x] 在隔离库生成旧版密码、Session、普通 Key/MCP Key 兼容记录；不复制真实密码或 Key。以新版 API 验证登录、get-session、JWT、Key 校验/限流/撤销及 user 归属。
- [x] 验证真实项目配置的 startup 与受保护路由，逐项核对旧 Key、API Key 冒充 Session、跨账号访问、外部指定 owner、MCP 的普通路由拒绝及注销后失效；不发真实邮件或 OAuth 请求。
- [x] 执行客户端 lint/build/typecheck、服务端 typecheck、MCP build。Docker 构建若执行，不在镜像或日志中带入任何 .env。
- [x] 完成任务 review 与阶段级最终 review；修复重要问题后再记录通过，说明已有警告。
- [x] 明确报告 OAuth 真授权、真实数据迁移与生产部署仍未执行；若这些构成阶段 0 出口阻塞，按设计停在安全门禁，不宣称全系统重构完成。

## 后续阶段衔接

本子计划是已批准完整设计的第一阶段，不是缩减重构范围。阶段 A/B 的唯一会话快照、代次隔离、JWT single-flight、路由/缓存/上传接入，在升级基线确认后另列可执行子计划；阶段 C/D 的领域归属与性能验收随后进行。真实迁移或 OAuth 条件不足时记录准确阻塞，并让用户选择授权迁移或先在隔离环境继续，不自行跨越安全门禁。

## 执行记录

- 基线：服务端 typecheck 和客户端 tsc 通过；原 pnpm dev 会话已停止，4000/4040/5173 未监听。
- Docker 可用，已存在 mongo:7 与 node:24-bookworm 镜像；无须引入 MongoDB 测试依赖。
- 计划自查：Task 1→2 共享 auth.ts/package.json，顺序执行；Task 2→3 共享迁移摘要与脚本，类型以 Task 2 为准；所有任务遵守不落盘测试、不提交、不写远程库的全局约束。
- 实施发现：新版 adapter 自动创建索引，因此把只读索引 readiness 前移到阶段 0；阶段 D 的额外性能索引仍单独评估。
- Task 3 隔离执行完成：4 条旧 Key 迁移后零 pending/冲突且非迁移字段保持；完整项目 HTTP 验证旧登录/Session/JWT/Key、限流、归属、防冒充、MCP 边界与注销清理通过。旧 JWKS 和验证码桥接由独立隔离库补验通过。任务 review 与阶段级最终 review 已通过；最终修复收紧无效 canonical 归属回退，并捕获旧归属转换异常，定向复审无新增问题。
- 验证警告：客户端 lint 有 4 条既有 no-explicit-any 警告，构建有大 chunk 警告；不声称零警告。未来新增 table-level index 前须处理索引选项的语义规范化，当前声明为空，不影响本次运行。
- 原开发服务未恢复，避免新版依赖连接未迁移的现有数据库；未提交、未推送。后续先在隔离环境继续 A/B 或先做真实环境迁移验收的顺序待用户选择。

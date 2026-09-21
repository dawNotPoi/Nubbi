# Better Auth 1.7.5 API Key 升级运行手册

## 当前测试环境执行记录（2026-09-21）

用户明确授权对原测试库 `Nubbi` 直接迁移，并明确免除备份。本次通过既有迁移服务函数执行，没有伪报 `--backup-complete`，未修改维护 CLI 的默认备份确认规则。

- 迁移前：API Key 共 2 条，待迁移 2 条，冲突 0；认证索引缺失 12，冲突与重复风险均为 0。
- 实际执行：补齐 2 条 Key 的兼容字段，创建 12 个认证索引，没有删除 Key 或业务文档。
- 迁移后复核：Key 总数仍为 2，pending/conflicts 均为 0；索引 missing/conflicting/duplicateRisk 均为 0。
- 使用原 server/client `.env` 启动本地服务，页面 `localhost:5173`、认证 `localhost:4000`、Socket `localhost:4040` 均返回 200；没有用真实账号密码代替用户登录。
- 此记录仅证明原测试库迁移及服务启动，不等同于生产部署或真实 OAuth/SMTP 全流程验收。由于用户选择不备份，本轮没有生成数据库回滚快照。

## 适用范围

本手册处理旧 API Key 缺少 `referenceId` / `configId` 的兼容迁移及认证索引交付。数据迁移脚本保留旧 `userId`、Key 哈希、metadata、permissions、过期和限流字段，不删除字段。生产镜像已包含 `server/scripts`，也可以从同版本完整 checkout 执行维护命令。

## 迁移前

1. 安排认证写入停机窗口，停止创建、更新、撤销 API Key，也停止账号创建与删除，避免用户集合和 Key 归属并发变化。
2. 对目标数据库完成可恢复备份，并记录备份时间、数据库名和恢复演练证据。
3. 保存迁移前 `apikey` 总数、缺少 `referenceId` 数、缺少 `configId` 数，以及抽样旧 Key 的可用性结果。不得把明文 Key 或哈希写入日志。
4. 确认 `MONGO_URI` 只通过进程环境提供；命令和日志不得打印 URI。

## Dry-run（默认且只读）

在仓库根目录运行：

```powershell
$env:MONGO_URI='<目标连接串>'
pnpm --dir server auth:migrate-api-keys -- --database <目标数据库名>
```

确认 `pending` 符合预期且 `conflicts` 为 0。空归属、新旧归属冲突、非 `default` 配置、孤儿用户或非法规范归属都会阻止安全迁移；先人工核实，禁止绕过。

认证索引同样先执行只读检查：

```powershell
pnpm --dir server auth:manage-indexes -- --database <目标数据库名>
```

输出只包含 `required`、`missing`、`conflicting`、`duplicateRisk` 计数。检查会复用名称不同但键顺序和 unique/sparse/partial/collation 语义等价的索引，不创建 TTL 索引，也不输出用户、Token、Key 或 URI。

## Apply（显式确认）

只有停写和备份完成后执行：

```powershell
pnpm --dir server auth:migrate-api-keys -- --database <目标数据库名> --apply --confirm-database <目标数据库名> --backup-complete
```

脚本先完成全量只读规划；存在冲突时零写入。每条写入都匹配规划时完整的新旧归属与配置状态，并在写入前重新确认用户存在；若并发改变文档或删除用户，会立即停止并报告此前更新数。全部写入后还会重新执行只读检查。独立 MongoDB 下这些跨集合检查不是事务，也不承诺整批回滚，因此停写窗口仍是硬性前提；中止后必须重新 dry-run 再决定后续动作。

API Key 迁移完成且索引 dry-run 无冲突、无唯一值重复风险后，显式创建缺失索引：

```powershell
pnpm --dir server auth:manage-indexes -- --database <目标数据库名> --apply --confirm-database <目标数据库名> --backup-complete
```

索引 apply 会在任何写入前完成全部冲突与唯一重复风险检查；有风险时零写入。它只创建缺失索引，不删除或重建现有索引。创建期间仍应保持认证停写，若数据库状态并发变化导致中途失败，保留错误输出并重新 dry-run，不得假定整批索引已回滚。

## 迁移后验证

1. 再次 dry-run，要求 `pending: 0`、`conflicts: 0`。
2. 比较迁移前后 `apikey` 总数；应完全一致。
3. 对抽样旧普通 Key 和 MCP Key 验证鉴权、权限边界、metadata、过期与限流策略保持不变。
4. 再次运行索引 dry-run，要求 `missing: 0`、`conflicting: 0`、`duplicateRisk: 0`；重复 apply 应返回 `created: 0`。
5. 启动服务，确认只读 readiness 门禁通过。门禁检查本项目显式认证索引及 Better Auth 官方表级索引，缺失、冲突或唯一重复风险都会拒绝启动并给出维护命令，但不会自动创建。
6. OAuth 的真实供应商授权仍需独立验证；本迁移不代表 OAuth 已验收。

## 回退边界

代码回退前先停止认证写入。新版创建的 Key 没有旧 `userId`，不能直接降级；必须从 `referenceId` 生成经过核对的 owner 回填方案，并保持撤销状态，绝不能从备份恢复已经撤销的 Key。若 apply 中途因并发停止，已完成的条件更新可以保留：脚本幂等，修复冲突后重新 dry-run/apply 即可。只有确认数据方案与旧版读取行为兼容后才能回退应用版本。

## 2026-09-21 隔离验收记录

阶段 0 已在仅绑定 `127.0.0.1:27028`、无真实数据卷的 MongoDB 7 容器完成。旧版 1.2.12 生成的 2 个虚构账号、2 个 Session 和 4 个普通/MCP Key 在迁移前为 `pending: 4, conflicts: 0`；显式 apply 更新 4 条后，重复 dry-run 为 `pending: 0, conflicts: 0`。迁移前后 Key 总数均为 4，除 `referenceId/configId` 外旧文档逐字段一致，哈希、metadata、permissions、过期和限流字段保持不变。

最新项目镜像通过完整 startup readiness，并以 HTTP 实际验证：旧密码登录、旧 Session、JWT、旧普通 Key/MCP Key、列表/创建/撤销、300 次/60 秒限流、跨账号资源隐藏、跨账号 Key 删除拒绝、外部 owner/config 伪造拒绝、API Key 不可冒充 Session 或管理 Key、MCP Key 不可访问普通 Note/File/Meeting。合成已验证账号通过真实账号清理 service 注销后，canonical 与 legacy-layout Key 文档均删除且不可用，另一账号保持可用。

“迁移字段保持”只描述本项目 CLI apply 完成后、首次使用 Key 之前的状态：该 CLI 只补 `referenceId/configId`。新版 API Key 插件在 verify/list 时会执行官方 `migrateDoubleStringifiedMetadata` / `batchMigrateLegacyMetadata`，把旧版双重 JSON 字符串 metadata 规范化并写回数据库。隔离 HTTP 运行后的复核显示 4/4 条 metadata 经两次 JSON 解析后语义一致，但字节不再与旧基线相等。因此真实升级的停写、备份和授权范围必须同时覆盖这项运行时写入；不得宣称新版服务运行后 metadata 字节永不变化，也不应 patch vendor 阻止官方兼容迁移。

另在独立隔离库确认：1.7.5 复用 1.2.12 生成的 JWKS，旧/新 JWT 均可由同一旧公钥验证；项目注册、邮箱验证及密码重置验证码桥接可消费新版 provider token，重置会撤销旧 Session。诊断只使用内存邮件回调，没有发送真实邮件。

以上只构成隔离环境的阶段 0 证据。执行真实迁移前仍必须取得以下授权和条件：

1. 明确目标数据库名称、可恢复备份与恢复演练证据。
2. 安排认证写入停机窗口，并批准对该数据库执行 dry-run/apply，以及新版首次 verify/list 可能触发的旧 metadata 规范化写入。
3. 提供 Google/GitHub 测试身份与控制台回调配置，单独验收真实 OAuth。
4. 验收真实 SMTP 传输与生产运行环境；完成后再决定部署或回退。

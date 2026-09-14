# 依赖管理

## 现状架构

本仓库是 **pnpm workspace monorepo**，由 `pnpm-workspace.yaml` 收录两个子项目：

- `client/`（nubbi-client，React + Vite）
- `server/`（nubbi-server，Express + tsx）

锁文件只有根目录一份 `pnpm-lock.yaml`；根 `package.json`（nubbi）不含业务依赖，只承担开发期编排：workspace 聚合安装、`pnpm --filter` 脚本、husky / commitlint。

## 一键安装

```bash
pnpm install   # 在仓库根目录执行，一次装完 client + server 所有依赖
```

常用编排脚本（均在根目录执行）：

| 命令 | 作用 |
| --- | --- |
| `pnpm dev` | 并行启动 client 和 server |
| `pnpm dev:client` / `pnpm dev:server` | 单独启动某一端 |
| `pnpm build:client` | 构建前端 |
| `pnpm lint:client` / `pnpm typecheck:server` | 代码检查 |

### 构建脚本白名单

pnpm 10 默认禁止依赖运行安装期构建脚本。`pnpm-workspace.yaml` 中的 `onlyBuiltDependencies` 已允许 `@parcel/watcher`、`@swc/core`、`esbuild` 三个含原生二进制的包运行构建脚本；如果后续新增此类依赖（安装时出现 `Ignored build scripts` 警告），需同步把包名加进该列表。

## 设计纪律：为拆库留后路

client 与 server 未来可能拆成两个独立开源仓库，因此约定：

1. **不在 client / server 之间写跨目录 import**（包括 tsconfig path 指向对方目录）。
2. **不添加 `workspace:*` 内部包依赖**，两个 package.json 保持完全自洽。
3. 需要共享的逻辑（如 API 类型），在各自项目内维护副本，或届时再评估发布独立 npm 包。

只要守住以上纪律，拆库步骤就是：

1. 把 `client/`（或 `server/`）目录整体拷入新仓库；
2. 在新仓库执行 `pnpm install` 生成独立的 `pnpm-lock.yaml`；
3. 按需带走根目录的 husky / commitlint / CI 配置。

## 历史备注

- 2026-07-11：删除了未被任何代码引用的 `shared/meta-field-defs.ts`（早期重构计划遗留）；移除了 `pnpm-workspace.yaml` 中硬编码的旧机器 `storeDir`（`E:/learning/Nubbi/...`），回落到 pnpm 默认全局 store。改动 storeDir 后首次 `pnpm install` 会重新链接 node_modules，属预期行为。

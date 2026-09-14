# Website Agent 规范

## 适用范围

本文件适用于 `website/` 及其全部子目录。Agent 在这里工作时，应把 Website 视为独立的 pnpm workspace 包，并遵守以下边界：

- 默认只修改 `website/`。
- 依赖发生变化时，可以同步修改仓库根目录的 `pnpm-lock.yaml`。
- 只有在 workspace 收录范围变化时，才修改根目录的 `pnpm-workspace.yaml`。
- 未经明确要求，不修改根 `package.json`、`client/`、`server/`、`mcp/`、Docker Compose 或现有部署脚本。
- 不通过跨目录相对路径直接引用其他 workspace 的源码。

## 项目定位

Website 是 Nubbi 面向公开阅读场景的笔记博客，中文名称为“拾光笔记”，英文品牌为“Nubbi Notes”。当前阶段只维护可运行、可构建的基础框架；功能范围以 `docs/decisions.md` 为准。

## 技术基线

- Next.js 16.2.10
- React / React DOM 19.2.7
- TypeScript 严格模式
- App Router 与 `src/` 目录
- Tailwind CSS 4.3.2
- ESLint 9
- Turbopack
- pnpm workspace 包名：`nubbi-website`
- 项目内路径别名：`@/*`

除非用户明确批准，不升级或替换以上核心技术，不引入 Next.js + Vite 的非官方组合方案。

## 常用命令

从仓库根目录执行：

```bash
pnpm --filter nubbi-website dev
pnpm --filter nubbi-website lint
pnpm --filter nubbi-website typecheck
pnpm --filter nubbi-website build
pnpm --filter nubbi-website start
```

添加或调整依赖后，从仓库根目录运行 `pnpm install`，并提交根 `pnpm-lock.yaml`。不要在 `website/` 内保留单独的锁文件。

## 工程约定

- 默认使用 Server Component；只有浏览器交互、客户端状态或浏览器 API 确有需要时才添加 `"use client"`。
- 路由、布局、元数据和错误边界遵循 App Router 约定，放在 `src/app/`。
- 项目内部导入优先使用 `@/*`，避免脆弱的多层相对路径。
- Tailwind CSS 4 通过全局 CSS 引入；没有明确需求时，不增加旧式 `tailwind.config.*`。
- 页面应优先使用语义化 HTML，并满足键盘操作、可读对比度和常见屏幕宽度下的响应式布局。
- 优先使用 Next.js 原生能力处理链接、图片、字体、元数据和缓存，不重复引入同类基础设施。
- 环境变量只提交 `.env.example`，不得提交真实密钥或本地 `.env*`。
- 不为尚未确定的功能提前引入状态管理、API 客户端、Markdown 管线、数据模型或部署配置。

## 文档与决策

- `docs/decisions.md` 是当前产品与工程决策的事实来源。
- 新讨论结论应记录日期，并明确标注为“已决定”“暂缓”或“待讨论”。
- 代码实现与文档冲突时，先确认期望并同步修正文档，不静默偏离已记录的决策。
- 引入新路由、数据来源、渲染策略或部署方案前，先在文档中落地边界和取舍。

## 完成标准

交付代码变更前至少运行：

```bash
pnpm --filter nubbi-website lint
pnpm --filter nubbi-website typecheck
pnpm --filter nubbi-website build
```

最后检查 Git 变更范围，确认没有意外修改其他 workspace。如果只修改文档，可以跳过生产构建，但仍应检查 Markdown 内容和变更边界。

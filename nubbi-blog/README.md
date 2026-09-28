# Nubbi Blog

从 [dawNotPoi/dawn](https://github.com/dawNotPoi/dawn) 迁入并重构的公开博客，
替代原 `website/`。仅负责已发布文章阅读，写作、编辑和发布继续使用 Nubbi Client。
上游提交和移除范围见 [来源记录](./docs/upstream.md)，接口设计见 [博客 PRD](../docs/blog/PRD.md)。

## 启动

需要 Node.js **22.12+**（推荐当前项目使用的 Node.js 24）和 pnpm **10.12.4**。
以下命令从 Nubbi 根目录执行：

```bash
pnpm install
pnpm dev:blog        # 仅博客：http://localhost:3002
pnpm dev:blog:full   # 博客 + Nubbi Server（4000）
pnpm dev:all         # 博客 + Server + 管理端 Client（5173）
```

原 `pnpm dev` 继续只运行 Server 与 Client。
也可使用 `scripts/dev.bat blog`（Windows）或 `bash scripts/dev.sh blog`。

博客通过服务端通用 API Token 调用现有 `/note/all` 与 `/note/detail`，不依赖 `/blog/*` 接口，不需要数据库连接。
将 `.env.example` 复制为 `.env.local`，在 Web 的账户菜单 → **鉴权管理** 中选择 **通用 API**，命名为「博客」，生成并复制 Token。
完整 Token 只在创建时显示一次，已有 Token 不能再次导出明文；MCP Agent Token 不能用于普通 `/note` 接口。

| 环境变量 | 用途 | 默认值 |
| --- | --- | --- |
| `NUBBI_API_URL` | Server API 基地址，不带 `/note` | `http://localhost:4000` |
| `NUBBI_API_TOKEN` | Web 生成的通用 API Token，仅服务端使用 | 无；列表显示空数据 |
| `BLOG_SITE_URL` | SEO 和分享链接的博客域名 | `http://localhost:3002` |
| `BLOG_SITE_NAME` | 独立博客站点名 | `Dawn` |
| `BLOG_SITE_DESCRIPTION` | 简介和默认描述 | 内置中文简介 |

真实 Token 填在本机 `.env.local` 或部署环境中，不提交、不粘贴到聊天，不使用 `NEXT_PUBLIC_` 前缀。该 Token 有完整账号能力，博客仅执行读取请求；需要停用时在 Web 撤销。
当前本机联调的 API 地址为 `http://127.0.0.1:4000`，使用用户启动的本机 Server；所配置的通用 Token 已通过该服务认证。原远程地址对相同凭证返回 401，本次未部署远程。切换服务或配置 Token 后重启博客；跨公网部署应使用正确的 HTTPS API 地址传输凭证，并确认具备 `/note` 分页契约。

博客只展示 Token 所属账号已发布、无密码、未删除的笔记，不再通过 `BLOG_AUTHOR_ID` 选择作者。
缺 Token 或连接超时显示空列表；无效／过期／类型错误的 Token 保留认证错误。服务端先过滤后分页，避免篇数错误；旧版本返回数组时会报告契约不匹配。

## 发布与阅读

1. 在 Nubbi Client 创建或编辑笔记，正文保存为 Markdown。
2. 使用已有发布开关将笔记的 `published` 设为 `true`。
3. 无密码、未进入回收站的已发布笔记出现在博客中。

可以设置封面、标签、作者，以及 `meta` 中的 `excerpt` 摘要；
列表没有显式摘要时留空，详情才从正文生成摘要。笔记接口支持标题／标签查询和稳定排序，
页面按原版博客直接展示最新文章。默认卡片列表每页 10 篇，以页码读取更多文章。
文章使用稳定地址 `/blog/<Note ID>`，旧 Dawn 的 `/home` 自动跳到首页。
内部 `status` 与公开发布独立；密码笔记、草稿和回收站文章不会公开。
撤回发布后，新的页面/API 请求会重新校验；已经显示在读者屏幕上的内容不会被远程抹除。

正文支持 GFM 表格、任务列表、代码高亮和复制，以及按需绘制的 Mermaid 示意图；图表加载失败可查看源码，原始 HTML 与视频嵌入不执行。自动摘要提取正文段落，开头与文章标题相同的一级标题不重复展示。
目录根据实际标题生成，重复标题拥有独立锚点。本轮完成桌面三页及亮暗主题；移动端专门设计与验收另行处理。
旧版浏览量、点赞、聊天、视频、会议、AI 和独立登录已移除。

## 正文与链接预览

参考 [Shiro](https://github.com/Innei/Shiro) 的行内链接与独立链接卡片交互，
在 Nubbi 中独立实现。单独成段的网页链接自动显示卡片：

```markdown
https://github.com/Innei/Shiro

阅读中可以引用 [Next.js 文档](https://nextjs.org/docs)。

> [!TIP]
> 提示块保留 Markdown 格式，也支持 NOTE、IMPORTANT、WARNING、CAUTION。
```

行内链接可通过悬停、键盘焦点或旁边的预览按钮读取标题、摘要和目的地址。
点击原链接仍直接导航；站内文章使用本站路由，外链打开新标签。
卡片进入视口附近才获取摘要，失败时保留链接，长标题与地址支持窄屏换行。
普通配图可点击放大，Esc 或关闭按钮退出并恢复焦点；链接内的图片保留原始导航。
正文提供语言／行数、代码复制、提示块、中文脚注、桌面章节目录与阅读进度。
文章页可复制规范链接，页尾可以回到顶部或文集。
从筛选列表进入文章后，返回链接会保留搜索、标签与页码。

Markdown 与高亮在服务端执行，浏览器只加载交互组件。
预览请求在浏览器限并发 4、服务端限并发 8，同一外链去重；
外站摘要分别缓存 5 分钟和 15 分钟，站内文章不使用摘要缓存。

预览接口只返回纯文本标题、摘要与来源，外站请求限制为 HTTP(S) 默认端口、
固定公网 IP、最多 3 次重定向、总超时 4.5 秒、最多 192 KiB HTML。
若系统 DNS 返回代理合成的 `198.18.0.0/15` 地址，默认使用 Cloudflare DNS 获取真实地址，
仅发送域名；设置 `BLOG_PREVIEW_DNS_FALLBACK=off` 可关闭该兼容行为。

## 构建与检查

```bash
pnpm lint:blog
pnpm typecheck:blog
pnpm typecheck:server
pnpm build:blog
pnpm start:blog      # 生产模式：http://localhost:3002
```

Next.js 动态渲染公开数据，构建不需要连接数据库；实际阅读需要启动 Nubbi Server。
部署时先构建再启动，配置真实的 `BLOG_SITE_URL`、`NUBBI_API_URL` 和私有 `NUBBI_API_TOKEN`。
自定义端口示例：`pnpm --filter nubbi-blog exec next dev --port 3010`，并同步站点 URL。

截至 2026-09-23，应用使用 npm 稳定版 Next.js **16.3.6**、React **19.3.0**、
Tailwind CSS **4.3.3**。TypeScript 保持 **6.0.3**，因为当前
`typescript-eslint` 不支持 TypeScript 7；ESLint 保持 **9.39.5**，因为当前
Next.js ESLint 插件依赖不支持 ESLint 10。
依赖统一记录在仓库根 `pnpm-lock.yaml`。

## 统一颜色主题

全站颜色集中在 [`src/styles/theme.css`](./src/styles/theme.css)，
由 `src/app/globals.css` 一次引入，默认跟随系统主题。
顶栏按钮可切换亮／暗模式，选择保存在浏览器并跨标签同步；首次绘制前恢复，存储不可用时仍支持本页切换。
偏好校验和存储集中在 `src/features/appearance/`，组件不直接操作 Storage。
更换配色只修改该文件；字体、宽度、圆角等基础参数保留在 `tokens.css`。

| 用途 | CSS 变量 | Tailwind 示例 |
| --- | --- | --- |
| 页面／卡片／弱背景 | `--bg-page` / `--bg-surface` / `--bg-muted` | `bg-page` / `bg-surface` / `bg-surface-muted` |
| 主／次／辅助文字 | `--text-primary` / `--text-secondary` / `--text-tertiary` | `text-primary` / `text-secondary` / `text-tertiary` |
| 边框 | `--border-default` | `border-divider` |
| 强调色与悬停 | `--accent` / `--accent-hover` | `bg-accent hover:bg-accent-hover` |
| 强调色上的文字 | `--on-accent` | `text-on-accent` |
| 选中背景与焦点 | `--accent-soft` / `--focus-ring` | `bg-accent-soft outline-focus` |
| 标签与文章悬停 | `--tag-bg` / `--tag-text` / `--post-hover` | CSS 语义变量 |
| 代码背景、文字、高亮 | `--code-bg` / `--code-text` / `--code-keyword` 等 | `bg-code-bg text-code-text` |

普通 CSS 使用 `color: var(--text-secondary)`，组件可直接使用上述语义类。
默认 Tailwind 色板已关闭；不在组件或业务样式中写十六进制、RGB、颜色名称、
`text-green-600` 等默认色板类或任意颜色值。`inherit`、`currentColor`、`transparent` 可用于继承与透明。
按钮悬停、选区和代码工具栏边框也使用独立主题变量，避免颜色随组件各自变化。

## 桌面三页与阅读排版

当前基于 [Dawn 历史版本](https://github.com/dawNotPoi/dawn/tree/fc5e2a77a78e877a4e7880e6491afce922d4a97c) 的独立身份，落实已确认的蜂蜜黄设计稿。
顶栏只有「首页 / 文集」两个页面入口，另设亮暗主题按钮。

| 页面 | 内容 |
| --- | --- |
| `/` 首页 | 稳定问候、圆形原版头像、近期文章时间线 |
| `/blog` 文集 | 真实篇数、单列文章、主题色标签、最多四行摘要、日期、分页 |
| `/blog/[id]` 详情 | 左对齐标题与摘要、约 740px 正文、右侧目录与进度、返回文集 |

文集保留原有暖色悬停／键盘聚焦背景、真实标题和摘要链接、按阅读意图预取与导航等待反馈。
正文使用 17px 系统字体和 1.95 行高；蜂蜜色只用于重点和交互，长文使用中性的阅读文字色。
字体规范集中在 `tokens.css`：摘要 16px、导航 14px、次级信息 13px、标签与日期至少 12px；列表／分区标题 24px、正文二级标题 28px。
字重统一为 400／500／600。中文标题与正文共享系统无衬线字体栈，Dawn 英文字标与首页姓名保留 Georgia，代码共用等宽栈；亮暗主题使用同一套排版，不额外下载字体。
代码、表格、引用和链接预览共用主题颜色；原版头像与 favicon 保留。

博客使用 Dawn 的独立身份，Nubbi 提供账号笔记数据，博客服务端筛选并公开已发布文章；
不恢复写作、浏览量、点赞、会议、聊天或 AI 功能。
颜色集中维护在 `src/styles/theme.css`，字体使用系统 UI 字体栈。
旧版紧凑布局的设计记录仍保存在文档中，仅供历史追溯。

加载、空态、连接错误与 404 是三页的配套状态，`/api/link-preview` 是正文预览所需的支持接口，均保留。
三页分别使用对应结构的加载占位：首页保留真实介绍，文集保留介绍与条目分区，正文保留阅读栏和侧边目录的宽度关系；占位和等待按钮同样消费蜂蜜黄主题。
没有其他业务内容页面；无调用方的筛选面板、阅读设置、装饰背景和自带字体资源已清理。
本轮只验收桌面端，现有窄屏回退规则保留，移动端后续单独处理。

旧版紧凑布局的视觉记录见 [余白紧凑列表验证](../docs/blog/yohaku-compact-verification.md)，
数据库接入记录见 [数据库验证](../docs/blog/shiro-design-verification.md#数据库与本地服务)。

## 目录结构

```text
src/app/                      路由、SEO、布局和错误边界
src/config/site.ts            服务端环境配置
src/components/               站点页头、导航和主题按钮
src/features/appearance/      亮暗主题的校验、存储与同步
src/features/blog/api/        笔记 API、Token 请求、公开过滤与展示适配
src/features/blog/components/  首页、文集、Markdown 与阅读组件
src/features/blog/hooks/       目录、链接预览、配图与剪贴板交互
src/features/blog/links/       地址分类、摘要契约、请求去重与服务端抓取
src/features/blog/markdown/    标题锚点、节点处理与提示块解析
src/styles/                   主题 token、布局、文章流和正文样式
```

组件不直接操作 Cookie / Storage，不跨 workspace 引用源码，也不在浏览器中使用私有 API Key。
后端请求始终经过运行时校验，网络失败呈现重试状态，不会伪装为“没有文章”。

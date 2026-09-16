# Nubbi Blog

从 [dawNotPoi/dawn](https://github.com/dawNotPoi/dawn) 迁入并重构的公开博客，
替代原 `website/`。仅负责已发布文章阅读，写作、编辑和发布继续使用 Nubbi Client。
上游提交和移除范围见 [来源记录](./docs/upstream.md)，接口设计见 [博客 PRD](../docs/blog/PRD.md)。

## 启动

需要 Node.js **20.19+**（推荐当前项目使用的 Node.js 24）和 pnpm **10.12.4**。
以下命令从 Nubbi 根目录执行：

```bash
pnpm install
pnpm dev:blog        # 仅博客：http://localhost:3002
pnpm dev:blog:full   # 博客 + Nubbi Server（4000）
pnpm dev:all         # 博客 + Server + 管理端 Client（5173）
```

原 `pnpm dev` 继续只运行 Server 与 Client。
也可使用 `scripts/dev.bat blog`（Windows）或 `bash scripts/dev.sh blog`。

博客默认读取 `http://localhost:4000`，无需数据库或登录密钥。
需要自定义时，将本目录 `.env.example` 复制为 `.env.local`：

| 环境变量 | 用途 | 默认值 |
| --- | --- | --- |
| `NUBBI_API_URL` | 仅服务端访问的 Nubbi 地址，不带 `/blog` | `http://localhost:4000` |
| `BLOG_SITE_URL` | SEO 和分享链接的博客域名 | `http://localhost:3002` |
| `BLOG_SITE_NAME` | 页面品牌 | `Nubbi Blog` |
| `BLOG_SITE_DESCRIPTION` | 简介和默认描述 | 内置中文简介 |
| `NUBBI_EDITOR_URL` | 可选的写作入口；空值隐藏 | 未设置 |

主服务继续使用 `server/.env`，完整必填项见 `server/.example.env`。
当前本机主服务使用现有连接凭据直连 `dawnpoi.site` 上的 `Nubbi` 库，
由 `server/.env` 中的 `MONGO_DB_NAME=Nubbi` 指定；连接串和凭据不进入博客配置或版本库。
在主服务设置可选的 `BLOG_AUTHOR_ID`，可只展示指定账户的文章；
不设置时展示所有用户主动发布且无密码的文章。该约束对列表、标签与详情同时生效。

## 发布与阅读

1. 在 Nubbi Client 创建或编辑笔记，正文保存为 Markdown。
2. 使用已有发布开关将笔记的 `published` 设为 `true`。
3. 无密码、未进入回收站的已发布笔记出现在博客中。

可以设置封面、标签、作者，以及 `meta` 中的 `excerpt` 摘要；
没有摘要时从正文生成预览。标题与标签支持关键词搜索，筛选、排序和页码保存在 URL。
默认紧凑视图每页 10 篇，支持最新／最早／最近更新排序。
文章使用稳定地址 `/blog/<Note ID>`，旧 Dawn 的 `/home` 自动跳到首页。
内部 `status` 与公开发布独立；密码笔记、草稿和回收站文章不会公开。
撤回发布后，新的页面/API 请求会重新校验；已经显示在读者屏幕上的内容不会被远程抹除。

正文支持 GFM 表格、任务列表、代码高亮和复制；原始 HTML 与视频嵌入不执行。
目录根据实际标题生成，重复标题拥有独立锚点。界面支持手机、平板、桌面及系统暗色模式。
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
正文提供语言／行数、复制、提示块、中文脚注、章节目录和阅读进度。
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
部署时先构建再启动，配置真实的 `BLOG_SITE_URL` 和 `NUBBI_API_URL`。
自定义端口示例：`pnpm --filter nubbi-blog exec next dev --port 3010`，并同步站点 URL。

截至 2026-09-05，应用使用 npm 稳定版 Next.js **16.3.4**、React **19.2.8**、
Tailwind CSS **4.3.3**。TypeScript **6.0.3** 和 ESLint **9.39.5** 是当前
Next.js ESLint 插件依赖支持的最新版本；其 peer 范围暂不支持 TypeScript 7 / ESLint 10。
依赖统一记录在仓库根 `pnpm-lock.yaml`。

## 统一颜色主题

全站颜色集中在 [`src/styles/theme.css`](./src/styles/theme.css)，
由 `src/app/globals.css` 一次引入，默认跟随系统，也可通过页头选择浅色或深色。
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

## 排版与移动阅读

当前视觉直接对照 [innei.in 的紧凑文稿页](https://innei.in/posts?view_mode=compact)：
奶白底、深中性色、低饱和玫瑰暖色、轻量导航与细小背景光点。
PC 列表容器约 896px，左侧文章区 588px、右侧搜索／标签栏 252px，间隔 56px；
更宽的屏幕扩展到 1072px。条目为 16px 标题、13px 单行摘要、12px 日期与标签，整行可打开。

1024px 以下隐藏桌面侧栏，搜索与标签通过原生弹层展开，主导航放在底部；
阅读页使用独立阅读工具栏。首页是居中介绍，正文采用无外框的 920px 宽栏与轻目录。
颜色继续统一维护在 `src/styles/theme.css`，背景效果可在页脚关闭，减少动态效果模式不显示光点。

拉丁字体使用本地托管的 Instrument Sans（约 30 KB，OFL 许可），
中文优先使用设备已安装的 MiSans，再回退到系统字体；页面不向字体服务发送请求。
字体许可和来源保存在 `public/fonts/instrument-sans-OFL.txt` 与设计验证文档中。

阅读侧栏和手机底部工具栏可切换宋体／黑体与大字模式，调整时保持可见段落的位置。
手机目录通过原生对话框展开，选择章节自动关闭；Esc 和关闭按钮恢复焦点与页面滚动。
底部工具栏预留安全区。主题、字体和字号在独立存储模块维护，首屏恢复合法偏好；
浏览器限制存储时仍可在当前页面使用，清除站点数据即可恢复默认值。

最新视觉验证见 [余白紧凑列表验证](../docs/blog/yohaku-compact-verification.md)，
数据库接入记录见 [数据库验证](../docs/blog/shiro-design-verification.md#数据库与本地服务)。

## 目录结构

```text
src/app/                      路由、SEO、布局和错误边界
src/config/site.ts            服务端环境配置
src/components/               站点页头与页脚
src/features/appearance/      外观偏好、首屏恢复与跨标签页同步
src/features/blog/api/        公开 API、Zod 契约和请求错误
src/features/blog/components/  列表、筛选、Markdown 与阅读组件
src/features/blog/hooks/       目录、链接预览、配图与剪贴板交互
src/features/blog/links/       地址分类、摘要契约、请求去重与服务端抓取
src/features/blog/markdown/    标题锚点、节点处理与提示块解析
src/styles/                   主题 token、布局、文章流和正文样式
```

组件不直接操作 Cookie / Storage，不跨 workspace 引用源码，也不在浏览器中使用私有 API Key。
后端请求始终经过运行时校验，网络失败呈现重试状态，不会伪装为“没有文章”。

# Nubbi Blog 接入验证

日期：2026-09-05。范围：从 Dawn 迁入 `nubbi-blog/`、替换 Website、公开 Note 接口与博客阅读体验。

## 工程检查

- `pnpm lint:blog`：通过，无警告。
- `pnpm typecheck:blog`：通过，Next.js 路由类型生成和 TypeScript 检查正常。
- `pnpm typecheck:server`：通过。
- `pnpm build:blog`：通过；首页、列表、文章均为动态服务端渲染，404 为静态页面。
- `pnpm start:blog`：生产服务成功启动于 3002，真实页面可访问。
- `pnpm dev:all`：同时启动 3002 博客、5173 Client 与 4000 主服务，三个入口实际返回 200。
- `pnpm install --frozen-lockfile --ignore-scripts`：通过，锁文件与八个 workspace 保持一致。
- Windows 启动辅助脚本的命令入口与帮助输出正常。
- 源码按 API、契约、展示、hooks 和样式职责拆分；新增源码文件均不超过 200 行。
- 未添加或修改自动化测试文件，未更新 changes，未提交 Git。

## 接口与发布边界

使用临时本地 MongoDB 8.0.18，数据库为 `nubbi_blog_validation`。
主服务采用当前真实路由、Controller 与 Note 模型；通过进程环境变量覆盖数据库地址，
未更改 `server/.env`，未向现有远程数据库写入演示数据。

- 13 篇公开文章与 3 篇私有对照记录：分页为 12 + 1，无重复。
- 草稿、密码文章、回收站文章不进入列表与标签，详情均 404。
- 响应不包含 password、userId、任意 meta 或内部状态；列表不含正文。
- 搜索、标签和组合筛选有效；正则元字符按字面匹配。
- 参数范围和 ID 格式错误返回 400，不存在文章返回 404。
- `BLOG_AUTHOR_ID` 对列表、详情及标签同时生效。
- 撤回发布后 API 立即 404，新页面响应不包含旧正文。
- 空 date 使用 createdAt；无 excerpt 从 Markdown 提取摘要；空密码可公开。
- 列表在数据库侧限制正文为 800 字符并只查询 excerpt 元数据。
- `/video`、`/video/room`、`/talk` 不再存在，返回 404。

## 浏览器验证

实际检查 1440×900、768×1024、390×844 三种视口，无页面横向溢出。
检查了搜索提交、组合筛选、空结果、清除筛选、下一页、文章跳转与返回。
正文高亮、GFM 表格、独立标题锚点、目录跳转、代码复制反馈正常。
Markdown 的原始 HTML 不执行，危险链接没有 javascript 地址，未渲染 video 或 iframe。

根据截图修正：手机目录默认折叠、桌面目录常驻，提高摘要字号。
为 Next.js 添加 smooth-scroll 标记，避免路由跳转受全局平滑滚动影响。

模拟主服务中断时显示可恢复错误页；恢复主服务后点击「重新加载」，
实际重新请求当前 URL 并恢复为 13 篇文章。修复了仅 reset 客户端边界无法恢复服务端错误的问题。

## 统一主题补充检查

- `src/styles/theme.css` 为唯一颜色定义，亮色、系统暗色、按钮状态、选区和代码高亮共用语义变量。
- 扫描 33 个 CSS / TypeScript 源文件，主题文件外无颜色字面量，所有 CSS 变量均有定义。
- 生产 CSS 已移除 Tailwind 默认色板，保留集中配置的语义颜色。
- 亮暗主题分别检查 18 组文字／背景对比度，最低分别为 4.60 和 5.81。
- 主题提取后再次通过 lint、typecheck、生产构建；桌面列表、平板和手机阅读页截图检查通过。
- 页面背景、文字、代码背景、代码文字和工具栏边框的浏览器计算样式与主题定义一致，无横向溢出。
- 本轮颜色检查采用临时本地预览响应，未连接数据库；前述接口边界检查采用真实隔离 MongoDB。
- 暗色主题完成变量与对比度检查，本轮浏览器截图使用亮色模式。

## 现有环境说明

安装时发现旧 node_modules 记录 Linux store 路径，已备份至忽略的 `.tmp/` 并重建 Windows 依赖。
现有 Client 的 tailwind-scrollbar / Tailwind 与 better-auth / Zod peer 警告仍属于原依赖组合，
本次没有扩大为 Client 的框架升级。
TypeScript 7、ESLint 10 超出当前 Next.js ESLint 插件 peer 范围，因此选用最新受支持版本。

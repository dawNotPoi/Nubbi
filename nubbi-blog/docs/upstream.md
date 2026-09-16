# 上游来源与迁移

- 仓库：https://github.com/dawNotPoi/dawn
- 导入日期：2026-09-05
- 导入提交：`fc5e2a77a78e877a4e7880e6491afce922d4a97c`
- 维护方式：源码导入并在 Nubbi 单仓迭代，不使用嵌套 Git 或 submodule。
- 上游未提供 LICENSE 文件，保留本记录说明来源，不附加新的上游授权声明。

## 改造范围

项目改名为 `nubbi-blog`，保留 Dawn 博客的列表／详情阅读结构、`/blog/:id` 地址和 favicon，
将混杂在 `app/utils/index.ts` 的请求拆为独立公开博客 API 模块。
列表组件、Markdown 阅读组件、文章目录和导航按单一职责重新实现。
旧 `/home` 重定向到新首页。

旧版 Next 14.2.3 / React 18 / Tailwind 3 升级至最新稳定版本；
以根 pnpm 锁文件为依赖事实来源。Next 16 使用异步路由参数、Turbopack 和 ESLint CLI。

移除视频房间、播放器、媒体流、VideoProvider、SocketProvider、会议请求、
动态、聊天／评论、AI、独立认证／数据库、实验页和未使用 UI。
不再依赖 socket.io-client、use-media-stream、NextAuth、MongoDB、AI SDK、
Arco、Radix Themes、Ant Design、Framer Motion 预发布版与旧 webpack loader。

旧浏览量／点赞字段已从 Nubbi Note 模型删除，因此不展示虚假统计。
旧 HTML／JSON 阅读路径迁为当前 Note Markdown 格式，原始 HTML 不执行。
原会话缓存和滚动定时器迁为服务端渲染、URL 查询参数和明确分页。

后续同步上游应按功能人工挑选提交，不直接覆盖当前接口、安全边界和 workspace 配置。

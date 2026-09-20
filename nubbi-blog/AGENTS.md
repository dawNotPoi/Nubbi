# Nubbi Blog 工作区规范

- 包名 `nubbi-blog`，从 dawNotPoi/dawn 迁入，来源记录见 `docs/upstream.md`。
- 先读根 AGENTS.md 与 `docs/blog/PRD.md`；只负责公开博客阅读，写作发布属于 Nubbi Client。
- 默认 Server Components，params/searchParams 为 Promise；交互逻辑放 feature hooks。
- API 契约、请求和数据适配放 `src/features/blog/api/`，只通过主服务公开 `/blog` 接口获取内容。
- 链接元数据由 Next `/api/link-preview` 提供，外站网络校验与解析集中在 `features/blog/links/server/`；必须保留固定公网 IP、超时、响应大小、重定向与并发限制。
- 不导入其他 workspace 内部源码，不在组件读写 Storage/Cookie，不将私有环境变量暴露到浏览器。
- 颜色唯一来源为 `src/styles/theme.css`，由 `src/app/globals.css` 统一引入；组件和其余 CSS 仅使用语义变量或对应 Tailwind 类，不硬编码颜色、不使用默认色板或任意颜色类。
- 字体、尺寸等基础 token 放 `src/styles/tokens.css`；公共组件类型明确，中文 JSDoc，单文件不超过 200 行。
- 外观偏好统一由 `src/features/appearance/` 校验、存储与同步；阅读排版的位置保持与目录浮层仍属于 `features/blog/`。
- 使用仓库根 pnpm 锁文件；不保留上游的单独锁文件、Git 仓库或无调用方依赖。
- 完成前运行根 `lint:blog`、`typecheck:blog`、`build:blog`，检查桌面、平板和手机布局。
- 按根规范，不创建或修改测试文件。

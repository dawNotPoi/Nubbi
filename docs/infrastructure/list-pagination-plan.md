# 2026-09-28 列表分页与博客 Token 接入

## 目标与规则

用户要求 Server 列表接口具备分页，并由博客复用通用 API Token 适配现有笔记接口。复用 `common/pagination.ts`：limit 默认 20、范围 1–50，offset 默认 0、非负安全整数；返回 items/total/count/limit/offset/hasMore/nextOffset。先校验账号与过滤条件，再在数据库排序、skip/limit 和 count，禁止先截断 500 条再分页。排序追加唯一 ID，避免同时间记录随机换页。

本次接口形状变更需要 Server、Web、MCP、Blog 配套发布；旧调用方把 data 当数组的版本不能直接连接新版。仓库不自动部署，不创建测试文件，不改 UI 样式。已存在分页的接口保留其契约；旧会议 findByPage 保留 page/pageSize 和响应格式，补齐稳定排序。

## 接口清单

| 范围 | 实施 |
| --- | --- |
| note all / roots / children / recent / getNote / search | 补齐分页；列表增加 published、hasPassword、q、tag、order 通用筛选。所有条件始终与 actor.id、未删除条件合并 |
| note trash、MCP notes / search / trash | 保持已有分页 |
| tag/list、mcp-api/tags | 标签目录分页；无标签目录时，旧笔记标签通过数据库聚合去重、分页，避免读全量笔记 |
| file GET list | 保持现有文件夹优先的混合分页 |
| file POST list、GET folders | 补齐分页；旧 POST 保留当页 folders/files 分类，并增加统一分页数据 |
| meeting findMyMeeting / findAllMeeting / comments | 补齐分页，保持主持人权限、公开范围及过期处理语义 |
| meeting list / findByPage、blog posts | 保持已有分页 |
| blog tags（历史接口） | 补齐分页，不删除已有路由，不再被当前博客依赖 |

详情、祖先链、面包屑、统计、批量按 ID 查询、Socket 房间快照不是独立检索列表，保持原业务契约。Better Auth 内置 Token/Session 管理不是项目自有列表，继续依赖其插件契约。

## 调用方迁移

- Web 现有树、标签选择、文件夹选择与需要完整集合的页面通过共享分页收集器逐页读取，保持 UI 与既有完整集合行为；提供单页 API，后续页面可按需分页。收集器检查账号在每次等待后仍一致，失败不返回半份集合；不把后续页失败伪装为成功。
- MCP 标签工具暴露 limit/offset，返回分页及下一页提示。
- Blog 调用 `/note/all?published=true&hasPassword=false&limit=10&offset=...`，由 Server 完成筛选、排序、计数。适配层再次检查每条公开边界，异常记录视为契约错误，避免仅在客户端过滤造成总数不准确。详情仍调用 `/note/detail` 并检查发布、密码、删除状态。
- 博客 Token 仅服务端读取 `NUBBI_API_TOKEN`，使用 X-API-Key，不跟随重定向；缺配置列表为空，认证错误保留。使用 Web「鉴权管理 → 通用 API」创建，非 MCP Token。

## 执行步骤

- [x] 补齐笔记查询与 Schema，迁移博客到服务端分页。
- [x] 补齐标签、旧文件、会议及历史博客标签分页。
- [x] 同步 Web API 层与 MCP 工具，更新对应模块 PRD、博客 README。
- [x] 检查权限、稳定排序、边界与调用方；运行类型检查、lint、构建和无数据库写入的临时验证。
- [x] 记录验证范围及尚需用户配置的 Token，不把隔离验证说成远程联通。


## 2026-09-28 验证与限制

- 静态 review：检查路由校验 → actor 隔离 → 查询过滤／计数 → 分页返回 → Web/MCP/Blog 调用方；账号、主持人和目录权限沿用原逻辑。排序增加 ID 兜底，删除无调用方的 500 条截断逻辑。未改组件样式、登录流程和 Token 权限。
- Server typecheck、Blog lint/typecheck/build、MCP typecheck/build、Web 改动文件 eslint、Web Vite build 通过。
- Web 全量 TypeScript 检查仍被三个未修改文件的既有 Array.at / lib 配置问题阻塞：useFileManagerController.ts:118、routePath.ts:25、use-comment-scroll.ts:47。本轮不改变这些文件或编译目标；不能报告全项目类型检查通过。
- 无持久测试文件、无数据库写入的临时 Node 校验：使用实际 Note 查询代码、Schema 与内存查询替身，检查布尔参数、非法分页、字面搜索、账号/发布/密码/删除过滤、65 条分为 50+15、越界空页和不带正文；这不是实际 MongoDB 集成验收。
- 使用实际 Next 生产构建 + 隔离 HTTP 上游（虚构 Token，仅进程环境）：验证 X-API-Key、筛选参数、10+2 分页与详情，草稿/密码/删除详情不可见，HTML 与日志无 Token/内部字段；503 空态、恢复后无旧缓存，401、旧数组契约和不安全列表拒绝。没有调用真实账户或写入数据库。
- Web 分页收集器验证了后续页异常、账号代次变化与不前进 nextOffset 均拒绝整次结果，不返回半份/混合账号集合。
- 真实远程后端尚未部署这次分页更新，博客也尚未配置用户通用 Token；真实认证、真实数据库分页和浏览器视觉验收未完成。更新本地代码不代表线上生效。本轮没有提交、推送、部署。
- offset 分页采用稳定排序，不承诺在并发新增/删除/更新时间变化时提供跨页快照；需要完整集合的 Web 页面仍逐页收集，UI 按需加载属于后续独立优化。


## 2026-09-28 用户启动 Server 后的真实联调

- 用户提供通用 API Token，已写入 Git 忽略的 `nubbi-blog/.env.local`，未进入版本库或文档；不记录凭证明文。
- 相同凭证：原远程接口返回 401，本机 `127.0.0.1:4000` 返回 200/code=1。博客联调地址改为本机 Server 并重启，未部署或修改远程。
- 真实账号公开文章总数 3；使用 limit=1 读取 offset=0/1/2，三页 ID 不重复，分页偏移、数量和公开/密码/删除条件正确。
- 实际博客生产进程的首页、文集、首篇详情均 HTTP 200，包含真实文章标题；详情接口返回字符串正文，三页 HTML 均不含 Token。未读取或公开私有文章内容，未写数据库。
- 此证据补充了上节尚未完成的本机认证与笔记分页联调；其余列表的实际 MongoDB 集成和浏览器视觉验收仍未覆盖，远程认证仍未通过。

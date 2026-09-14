# 项目命名

## 功能目的

项目的英文开源名称统一为 `Nubbi`，用于代码库、包名和工程元信息；中文产品标题继续保留“拾光笔记”。

## 用户可见行为

- 浏览器页面标题仍为“拾光笔记”。
- 前端页面文案不因为本次工程命名调整发生变化。
- 开源或工程使用场景中，项目英文名称使用 `Nubbi`。

## 关键技术设计

- 根目录 `package.json` 的包名为 `nubbi`。
- `client/package.json` 的包名为 `nubbi-client`。
- `server/package.json` 的包名为 `nubbi-server`。
- npm 包名使用小写形式，符合发布和生态约定；展示名称可继续写作 `Nubbi`。
- MongoDB database name 通过 `MONGO_DB_NAME` 配置，默认值为 `Nubbi`。

## 边界和注意事项

- 本次不修改 `client/index.html` 中的中文标题“拾光笔记”。
- 如果旧环境已有旧名数据库，切换到 `MONGO_DB_NAME=Nubbi` 前需要迁移或复制 MongoDB 数据。
- 文档、部署路径和仓库地址统一使用 `Nubbi`。

## 新增命令或配置

没有新增命令。现有启动方式保持不变：

```bash
pnpm --dir client dev
pnpm --dir server dev
```

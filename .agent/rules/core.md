# 核心规则

## 编写代码前
- 先读 `docs/<module>/PRD.md` — 了解已有组件和 API，禁止重复造轮子
- 先读 `.agent/skills/code.md` 和 `.agent/skills/style.md`

## 编写代码时
- 单文件 ≤ 200 行；超出则拆分
- 无 `any`；所有公开函数/组件必须有明确类型
- 不加无意义注释；只在逻辑非显而易见时注释原因
- 配置/密钥不硬编码，用 `env`
- 禁止跨层调用：Route → Controller → Model，不跳层
- 禁止在组件中直接读写 Cookie / LocalStorage

## 提交规范

### Commit 格式
- 格式：`<type>(<scope>): <subject>`
- **type 用英文**：`feat` / `fix` / `refactor` / `docs` / `style` / `test` / `chore`
- **scope 用英文**：`server` / `client` / `shared` / `config` / `agent`
- **subject 用中文**，简明描述做了什么，≤ 50 字

示例：
```
feat(server): 新增用户登录接口
fix(client): 修复登录按钮点击无响应
refactor(shared): 抽取公共验证逻辑为独立工具函数
docs(agent): 补全工作流第四步说明
chore(config): 升级 vite 至 5.4
```

### Commit 前必做
- 先更新 `docs/changes/YYYY-MM-DD.md`（按 `docs/changes/_TEMPLATE.md` 格式）
- changes 文件自身的 commit 不需要记录

## 禁止
- 引入重量级框架替代品（Redux、Prisma、tRPC 等）；工具包可合理使用
- 删除代码前确认无调用方；不确定时先问
- commit 由用户决定，除非用户明确说"commit"，否则不主动提交

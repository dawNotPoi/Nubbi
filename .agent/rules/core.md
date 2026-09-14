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

## 变更记录
- 只有用户要求更新 changes 或 commit 时才更新 `docs/changes/YYYY-MM-DD.md`
- 记录内容按 `docs/changes/_TEMPLATE.md` 格式追加，说明变更文件、原因和 review 结果
- changes 文件自身的变更不需要再记录到 changes
- 用户要求 commit 时，先更新 changes，再对当天 changes 文件执行 `git add` 暂存
- changes 必须和本次代码、文档、配置或脚本变更放进同一个 commit

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
1. 更新 `docs/changes/YYYY-MM-DD.md`，确认已覆盖本次变更
2. 执行 `git status` 展示暂存区和工作区统计，列出所有改动文件
3. 询问用户是否将相关改动加入暂存区（`git add`）
4. 暂存完成后，让用户确认是否提交（展示完整 commit message 供用户最终确认）

## 禁止
- 引入重量级框架替代品（Redux、Prisma、tRPC 等）；工具包可合理使用
- 删除代码前确认无调用方；不确定时先问
- commit 由用户决定，除非用户明确说"commit"，否则不主动提交

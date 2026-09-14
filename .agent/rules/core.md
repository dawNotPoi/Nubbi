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

## 禁止
- 引入重量级框架替代品（Redux、Prisma、tRPC 等）；工具包可合理使用
- 删除代码前确认无调用方；不确定时先问

# 代码审查

## 审查流程

1. 对照下方检查清单逐项审查代码
2. 按 `.agent/module-index.md` 匹配变更涉及哪些模块
3. 将结果写入 `docs/changes/YYYY-MM-DD.md`（按 `.agent/skills/workflow.md` 第四步格式）

## 检查清单

### 架构（最高优先级）
- [ ] 文件放在正确目录层级（controller/models/routes/middleware/lib 各司其职）
- [ ] 无跨层调用（Route 不直接操作 DB，Controller 不直接写 SQL）
- [ ] 无循环依赖
- [ ] 配置未硬编码（用 env 或 config）

### 代码质量
- [ ] 手写源码单文件 ≤ 1500 行（含注释与空行）；职责清晰，没有为了限制行数而压缩代码或机械拆分
- [ ] 命名规范：变量/函数 camelCase，类/组件 PascalCase，文件 kebab-case
- [ ] 无 `any` 类型滥用
- [ ] 错误处理完善（有日志，避免回调嵌套）

### 提交
- [ ] commit message 格式和 changes 暂存由 hook 自动校验，无需手动检查

### 技术栈约束
- [ ] 主服务端：Express 5.x + Mongoose 8.x + Zod 4（业务统一走 `zod/v3` API）+ Better-Auth 1.x
- [ ] 客户端：React 19.x + Base UI + `components/ui` 项目自有源码层 + Tailwind 4.x + Vite 5.x；不得重新引入 Ant Design 或第二套组件库
- [ ] 博客：Next.js 16.x + React 19.x + Tailwind 4.x（`nubbi-blog/`）
- [ ] 未引入重量级框架替代品（见 `.agent/rules/core.md` 禁止项）
- [ ] 未把 Assistant API（NestJS + Fastify）当作本仓库约定；它已迁出为独立仓库

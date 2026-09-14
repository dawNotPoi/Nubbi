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
- [ ] 单文件 ≤ 200 行
- [ ] 命名规范：变量/函数 camelCase，类/组件 PascalCase，文件 kebab-case
- [ ] 无 `any` 类型滥用
- [ ] 错误处理完善（有日志，避免回调嵌套）

### Git 提交
- [ ] 格式符合 `.agent/rules/core.md` 中的「提交规范」
- [ ] type/scope 用英文，subject 用中文

### 技术栈约束
- [ ] 服务端：Express 4.x + Mongoose 8.x + Zod 3.x + Better-Auth 1.x
- [ ] 客户端：React 18.x + Ant Design 5.x + Tailwind 3.x + Vite 5.x
- [ ] 未引入重量级框架替代品（如 Redux、Prisma、tRPC）；工具包可合理使用

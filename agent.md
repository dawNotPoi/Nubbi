# Agent 规范

## 工作流

```
沟通方案 → 更新 PRD → 编写代码 → review → 更新 changes → commit
```

### 第一步：沟通 & 更新 PRD

1. 与用户确认功能需求或修复方案，达成一致后再动代码
2. **模块流程有较大变动时**，先画 Excalidraw 流程图，与用户对齐后再更新 PRD 和编码
   - 保存至 `docs/<module>/<feature>.excalidraw`
   - 流程图应覆盖：数据流向、模块边界、关键分支路径
3. 如涉及 API、组件接口或数据模型变动，**先**更新 `docs/<module>/PRD.md`，再开始编码
4. 读 `docs/<module>/PRD.md` 理解现有架构和可复用组件，避免重复造轮子

### 第二步：编写代码

1. 遵循下方「审查检查清单」和「代码约束」
2. 按模块索引确认文件放置位置

### 第三步：review

代码改动完成后执行：

```bash
pnpm agent review              # review 最近一次提交
pnpm agent review <hash>       # review 指定提交
pnpm agent review --today      # review 今天所有提交
```

review 做的事：
1. 对照下方检查清单逐项审查代码
2. 按模块索引匹配变更涉及哪些模块
3. 将结果写入 `docs/changes/YYYY-MM-DD.md`（见第四步）

### 第四步：更新 changes（commit 前必做）

在 `docs/changes/YYYY-MM-DD.md` 中追加本次变更记录：

```markdown
## [HH:mm] commit: `<hash>` - <message>

**提交者**: <author>
**变更文件**:
- path/to/file.ts（新建/修改）

**Review 结果**: ✅ 通过 / ⚠️ 警告 / ❌ 未通过

### 变更摘要
- 简述改动内容和原因
```

- 文件不存在时按 `docs/changes/_TEMPLATE.md` 新建
- changes 文件自身的 commit 不需要在 changes 里再记录

### 第五步：commit

确认 changes 已更新后再执行 `git commit`。

## 命令

```bash
pnpm agent review              # Review 最近一次提交
pnpm agent review <hash>       # Review 指定提交
pnpm agent review --today      # Review 今天所有提交
```

---

## 审查检查清单

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
- [ ] 格式：`<type>(<scope>): <subject>`
- [ ] type 正确：feat/fix/refactor/docs/style/test/chore
- [ ] scope 正确：server/client/shared/config/agent
- [ ] subject 祈使句现在时，≤50 字符

### 技术栈约束
- [ ] 服务端：Express 4.x + Mongoose 8.x + Zod 3.x + Better-Auth 1.x
- [ ] 客户端：React 18.x + Ant Design 5.x + Tailwind 3.x + Vite 5.x
- [ ] 未引入重量级框架替代品（如 Redux、Prisma、tRPC）；工具包可合理使用

---

## 模块索引

见 `.agent/module-index.md`。

---

## 代码约束

### 界面样式
1. 图标按钮用固定尺寸容器（`size-12`、`size-10`），避免内容变化导致跳动
2. 圆形按钮用原生 `button` + `grid place-items-center`，图标几何居中
3. 表单统一高度；验证码按钮固定宽度 `shrink-0`，输入框 `min-w-0 flex-1`
4. 暖白/中性背景、细边框、低阴影、克制色彩，不引入强装饰和重阴影
5. 样式完成后检查无横向溢出、图标居中、文本不截断、表单对齐稳定

### 禁止
- ❌ 在 Component 中直接操作 Cookie/LocalStorage
- ❌ 硬编码配置值
- ❌ 跨层调用

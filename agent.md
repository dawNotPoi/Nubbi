# Agent 规范

## 工作流

```
git commit → pnpm agent review → 审查 + 记录 + 更新 PRD
```

**审查时做的事**：
1. 对照下方检查清单逐项审查代码
2. 按模块索引匹配变更涉及哪些模块
3. 结果写入 `docs/changes/YYYY-MM-DD.md`
4. 如 API/组件/数据模型有变，更新对应 `docs/<module>/PRD.md`

**开发时做的事**：
1. 读 `docs/<module>/PRD.md` 理解模块架构和可复用组件
2. 遵循下方约束编写代码
3. 完成后 `pnpm agent review`

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
- [ ] UTF-8 编码
- [ ] 命名规范：变量/函数 camelCase，类/组件 PascalCase，文件 kebab-case
- [ ] 无 `any` 类型滥用
- [ ] 公共方法有 JSDoc
- [ ] 错误处理完善（自定义错误类，有日志，避免回调嵌套）

### Git 提交
- [ ] 格式：`<type>(<scope>): <subject>`
- [ ] type 正确：feat/fix/refactor/docs/style/test/chore
- [ ] scope 正确：server/client/shared/config/agent
- [ ] subject 祈使句现在时，≤50 字符

### 技术栈约束
- [ ] 服务端：Express 4.x + Mongoose 8.x + Zod 3.x + Better-Auth 1.x
- [ ] 客户端：React 18.x + Ant Design 5.x + Tailwind 3.x + Vite 5.x
- [ ] 新增依赖不超出以上范围

---

## 模块索引

Agent 按以下规则匹配变更文件所属模块：

| 代码路径 | 模块 | PRD |
|---------|------|-----|
| `server/app/routes/note.ts`, `controller/note/**`, `models/note.ts` | note | docs/note/PRD.md |
| `client/src/views/note/**`, `views/NoteLibrary.tsx`, `features/note/**`, `api/note.ts`, `store/.../noteAtom.ts`, `component/editor/Tiptap/**`, `component/SideBar/NoteMenu/**` | note | docs/note/PRD.md |
| `server/app/routes/auth.ts`, `lib/auth.ts`, `lib/email*.ts`, `lib/*Verification.ts`, `middleware/session.ts` | auth | docs/auth/PRD.md |
| `client/src/views/login/**`, `views/reset-password/**`, `hooks/useAuth.ts`, `component/auth/**`, `component/AccountDeletionModal.tsx` | auth | docs/auth/PRD.md |
| `server/app/routes/meeting.ts`, `models/meeting*.ts`, `socket/P2PHandler.ts` | meeting | docs/meeting/PRD.md |
| `client/src/views/meetings/**`, `views/meeting-room/**`, `component/MeetingList/**`, `api/meeting.ts` | meeting | docs/meeting/PRD.md |
| `server/app/routes/file.ts`, `models/file/**` | file | docs/file/PRD.md |
| `client/src/views/file-manage/**`, `component/upload/**`, `store/.../FileAtom.ts`, `api/file.ts` | file | docs/file/PRD.md |
| `server/app/routes/image.ts`, `models/image.ts` | image | docs/image/PRD.md |
| `server/app/routes/summary.ts`, `controller/summary.ts`, `models/summary.ts` | summary | docs/summary/PRD.md |
| `client/src/views/home/**` | home | docs/home/PRD.md |
| 其余所有（middleware、lib、common、shared components、store、utils、scripts、config、.agent、docs） | infrastructure | docs/infrastructure/PRD.md |

---

## 代码约束

### 文件
- 单文件 ≤ 200 行，层层封装
- UTF-8 编码

### 界面样式
1. 图标按钮用固定尺寸容器（`size-12`、`size-10`），避免内容变化导致跳动
2. 圆形按钮用原生 `button` + `grid place-items-center`，图标几何居中
3. 第三方登录：单个用"圆形按钮+短标签"，多个才用按钮组；禁用只隐藏不删代码
4. 表单统一高度；验证码按钮固定宽度 `shrink-0`，输入框 `min-w-0 flex-1`
5. 暖白/中性背景、细边框、低阴影、克制色彩，不引入强装饰和重阴影
6. 样式完成后检查无横向溢出、图标居中、文本不截断、表单对齐稳定

### 禁止
- ❌ 在 Component 中直接操作 Cookie/LocalStorage
- ❌ 硬编码配置值
- ❌ 跨层调用

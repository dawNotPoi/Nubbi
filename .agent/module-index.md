# 模块索引

> 开发前读：`rules/core.md` → `skills/code.md` → `skills/style.md` → `docs/<module>/PRD.md`
> 审查时读：`agent.md`（根目录）

Agent 通过此文件判断代码变更属于哪个模块，决定需要更新哪个 PRD。

## 匹配规则

| 代码路径模式 | 模块 | PRD |
|-------------|------|-----|
| `server/app/routes/note.ts` | note | docs/note/PRD.md |
| `server/app/controller/note/**` | note | docs/note/PRD.md |
| `server/app/models/note.ts` | note | docs/note/PRD.md |
| `client/src/views/note/**` | note | docs/note/PRD.md |
| `client/src/views/NoteLibrary.tsx` | note | docs/note/PRD.md |
| `client/src/features/note/**` | note | docs/note/PRD.md |
| `client/src/store/atom/noteAtom.ts` | note | docs/note/PRD.md |
| `client/src/api/note.ts` | note | docs/note/PRD.md |
| `client/src/component/SideBar/NoteMenu/**` | note | docs/note/PRD.md |
| `client/src/component/editor/Tiptap/**` | note | docs/note/PRD.md |
| `server/app/routes/auth.ts` | auth | docs/auth/PRD.md |
| `server/app/lib/auth.ts` | auth | docs/auth/PRD.md |
| `server/app/lib/email*.ts` | auth | docs/auth/PRD.md |
| `server/app/lib/*Verification.ts` | auth | docs/auth/PRD.md |
| `server/app/middleware/session.ts` | auth | docs/auth/PRD.md |
| `client/src/views/login/**` | auth | docs/auth/PRD.md |
| `client/src/views/reset-password/**` | auth | docs/auth/PRD.md |
| `client/src/hooks/useAuth.ts` | auth | docs/auth/PRD.md |
| `client/src/component/auth/**` | auth | docs/auth/PRD.md |
| `client/src/component/AccountDeletionModal.tsx` | auth | docs/auth/PRD.md |
| `server/app/routes/meeting.ts` | meeting | docs/meeting/PRD.md |
| `server/app/models/meeting.ts` | meeting | docs/meeting/PRD.md |
| `server/app/models/meetingComment.ts` | meeting | docs/meeting/PRD.md |
| `server/app/socket/P2PHandler.ts` | meeting | docs/meeting/PRD.md |
| `client/src/views/meetings/**` | meeting | docs/meeting/PRD.md |
| `client/src/views/meeting-room/**` | meeting | docs/meeting/PRD.md |
| `client/src/component/MeetingList/**` | meeting | docs/meeting/PRD.md |
| `client/src/api/meeting.ts` | meeting | docs/meeting/PRD.md |
| `server/app/routes/file.ts` | file | docs/file/PRD.md |
| `server/app/models/file/**` | file | docs/file/PRD.md |
| `client/src/views/file-manage/**` | file | docs/file/PRD.md |
| `client/src/component/upload/**` | file | docs/file/PRD.md |
| `client/src/store/atom/FileAtom.ts` | file | docs/file/PRD.md |
| `client/src/api/file.ts` | file | docs/file/PRD.md |
| `server/app/routes/image.ts` | image | docs/image/PRD.md |
| `server/app/models/image.ts` | image | docs/image/PRD.md |
| `server/app/routes/summary.ts` | summary | docs/summary/PRD.md |
| `server/app/controller/summary.ts` | summary | docs/summary/PRD.md |
| `server/app/models/summary.ts` | summary | docs/summary/PRD.md |
| `client/src/views/home/**` | home | docs/home/PRD.md |
| `server/app/middleware/common.ts` | infrastructure | docs/infrastructure/PRD.md |
| `server/app/middleware/validator.ts` | infrastructure | docs/infrastructure/PRD.md |
| `server/app/lib/db.ts` | infrastructure | docs/infrastructure/PRD.md |
| `server/app/lib/env.ts` | infrastructure | docs/infrastructure/PRD.md |
| `server/app/common/**` | infrastructure | docs/infrastructure/PRD.md |
| `server/app/socket/userHandler.ts` | infrastructure | docs/infrastructure/PRD.md |
| `server/app/index.ts` | infrastructure | docs/infrastructure/PRD.md |
| `client/src/Route.tsx` | infrastructure | docs/infrastructure/PRD.md |
| `client/src/AppProvider.tsx` | infrastructure | docs/infrastructure/PRD.md |
| `client/src/App.tsx` | infrastructure | docs/infrastructure/PRD.md |
| `client/src/store/atom/common.ts` | infrastructure | docs/infrastructure/PRD.md |
| `client/src/api/request.ts` | infrastructure | docs/infrastructure/PRD.md |
| `client/src/component/Header.tsx` | infrastructure | docs/infrastructure/PRD.md |
| `client/src/component/SideBar/**` | infrastructure | docs/infrastructure/PRD.md |
| `client/src/component/UI/**` | infrastructure | docs/infrastructure/PRD.md |
| `client/src/utils/**` | infrastructure | docs/infrastructure/PRD.md |
| `.agent/**` | infrastructure | docs/infrastructure/PRD.md |
| `docs/**` | infrastructure | docs/infrastructure/PRD.md |
| `scripts/**` | infrastructure | docs/infrastructure/PRD.md |
| `package.json` | infrastructure | docs/infrastructure/PRD.md |
| `docker-compose.yml` | infrastructure | docs/infrastructure/PRD.md |

## 使用方式

Agent 收到变更文件列表后：

1. 逐个文件匹配此索引
2. 收集涉及的所有模块（去重）
3. 对每个模块，检查 PRD 是否需要更新
4. 需要更新的情况：新增 API、新增组件、修改数据模型、修改依赖
5. 不需要更新的情况：纯重构、样式调整、Bug 修复、内部实现优化

# 模块索引

> 用途：根据变更文件判断所属模块和需要阅读/更新的 PRD。
> 只在需要判断模块归属时读取本文件；不要把它作为每次任务的默认上下文。

## 使用方式

1. 用下方路径前缀或 glob 匹配变更文件。
2. 收集涉及模块并读取对应 PRD。
3. 仅当新增/修改 API、组件接口、数据模型、依赖或用户可见流程时更新 PRD。
4. 纯重构、样式微调、Bug 修复、内部实现优化通常不更新 PRD，但仍要更新 `docs/changes/YYYY-MM-DD.md`。

## 模块映射

| 模块 | PRD | 路径 |
|------|-----|------|
| note | `docs/note/PRD.md` | `server/app/routes/note.ts`, `server/app/controller/note/**`, `server/app/models/note.ts`, `client/src/views/note/**`, `client/src/views/NoteLibrary.tsx`, `client/src/features/note/**`, `client/src/store/atom/noteAtom.ts`, `client/src/api/note.ts`, `client/src/component/SideBar/NoteMenu/**`, `client/src/component/editor/Tiptap/**` |
| auth | `docs/auth/PRD.md` | `server/app/routes/auth.ts`, `server/app/lib/auth.ts`, `server/app/lib/email*.ts`, `server/app/lib/*Verification.ts`, `server/app/middleware/session.ts`, `client/src/views/login/**`, `client/src/views/reset-password/**`, `client/src/hooks/useAuth.ts`, `client/src/component/auth/**`, `client/src/component/AccountDeletionModal.tsx` |
| meeting | `docs/meeting/PRD.md` | `server/app/routes/meeting.ts`, `server/app/models/meeting*.ts`, `server/app/socket/P2PHandler.ts`, `client/src/views/meetings/**`, `client/src/views/meeting-room/**`, `client/src/component/MeetingList/**`, `client/src/api/meeting.ts` |
| file | `docs/file/PRD.md` | `server/app/routes/file.ts`, `server/app/models/file/**`, `client/src/views/file-manage/**`, `client/src/component/upload/**`, `client/src/store/atom/FileAtom.ts`, `client/src/api/file.ts` |
| image | `docs/image/PRD.md` | `server/app/routes/image.ts`, `server/app/models/image.ts` |
| summary | `docs/summary/PRD.md` | `server/app/routes/summary.ts`, `server/app/controller/summary.ts`, `server/app/models/summary.ts` |
| home | `docs/home/PRD.md` | `client/src/views/home/**` |
| knowledge-base | `docs/knowledge-base/phase2-mcp-auth-PRD.md`, `docs/knowledge-base/phase3-knowledge-base-PRD.md`, `docs/knowledge-base/phase4-external-ingestion-PRD.md` | `mcp/**`, `server/app/services/embedding/**`, `server/app/services/kb/**`, `server/app/services/ingestion/**`, `server/app/models/mcpToken.ts`, `server/app/models/noteEmbedding.ts`, `server/app/routes/mcpToken.ts`, `server/app/routes/kb.ts`, `client/src/views/settings/MCPTokenPanel.tsx` |
| infrastructure | `docs/infrastructure/PRD.md` | `server/app/middleware/**`, `server/app/lib/db.ts`, `server/app/lib/env.ts`, `server/app/common/**`, `server/app/socket/userHandler.ts`, `server/app/index.ts`, `client/src/Route.tsx`, `client/src/AppProvider.tsx`, `client/src/App.tsx`, `client/src/store/atom/common.ts`, `client/src/api/request.ts`, `client/src/component/Header.tsx`, `client/src/component/SideBar/**`, `client/src/component/UI/**`, `client/src/utils/**`, `.agent/**`, `docs/**`, `scripts/**`, `package.json`, `docker-compose.yml` |

# 工作流

```
沟通方案 → 更新 PRD → 编写代码 → review → 更新 changes → commit
```

无论是否立即 commit，每次完成代码、文档、配置或脚本变更后，都必须更新 `docs/changes/YYYY-MM-DD.md`。commit 前只做最终确认，不把 changes 记录延后到提交阶段。
用户要求 commit 时，agent 必须自动暂存当天 changes 文件，并把 changes 和本次变更放进同一个 commit。

## 第一步：沟通 & 更新 PRD

1. 与用户确认功能需求或修复方案，达成一致后再动代码
2. **模块流程有较大变动时**，先画 Excalidraw 流程图，与用户对齐后再更新 PRD 和编码
   - 保存至 `docs/<module>/<feature>.excalidraw`
   - 流程图应覆盖：数据流向、模块边界、关键分支路径
3. 如涉及 API、组件接口或数据模型变动，**先**更新 `docs/<module>/PRD.md`，再开始编码
4. 读 `docs/<module>/PRD.md` 理解现有架构和可复用组件，避免重复造轮子
5. 长时间方案讨论时，按 `.agent/rules/discussion-log.md` 精炼对话要点到 `docs/<module>/discussion.md`，让下一个 agent 快速理解上下文
6. 下一个 agent 接手时，先读 `docs/<module>/discussion.md` 再读 PRD

## 第二步：编写代码

1. 遵循 `.agent/rules/core.md` 中的约束
2. 遵循 `.agent/skills/code.md` 中的编码约定
3. 遵循 `.agent/skills/style.md` 中的样式约定
4. 按 `.agent/module-index.md` 确认文件放置位置

## 第三步：review

代码改动完成后，agent 直接审查当前 diff；不需要专门的 review 脚本。
详细审查清单见 `.agent/skills/review.md`。

## 第四步：更新 changes（每次变更必做）

在 `docs/changes/YYYY-MM-DD.md` 中追加本次变更记录：

```markdown
## [HH:mm] commit: `未提交` - <message>

**提交者**: <author>
**变更文件**:
- path/to/file.ts（新建/修改）

**Review 结果**: ✅ 通过 / ⚠️ 警告 / ❌ 未通过

### 变更摘要
- 简述改动内容和原因
```

- commit 后回填记录时，可将 `未提交` 替换为真实 hash
- 文件不存在时按 `docs/changes/_TEMPLATE.md` 新建
- changes 文件自身的 commit 不需要在 changes 里再记录
- 用户要求 commit 时，自动暂存 `docs/changes/YYYY-MM-DD.md`，并随本次变更一起提交

## 第五步：commit

- 确认 changes 已更新后再执行 `git commit`
- commit 前自动暂存当天 changes 文件
- commit 格式见 `.agent/rules/core.md` 中的「提交规范」
- **commit 由用户决定**，除非用户明确说"commit"，否则不主动提交

# 工作流

```
沟通方案 → 更新 PRD → 编写代码 → review → （用户要求时）更新 changes → commit
```

无论是否立即 commit，只有用户要求更新 changes 或 commit 时才更新 `docs/changes/YYYY-MM-DD.md`。
用户要求 commit 时，agent 必须：①更新 changes → ②展示暂存区统计 → ③询问是否将相关改动加入暂存区 → ④让用户确认是否提交。

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

## 第四步：更新 changes（用户要求时执行）

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
- 用户要求 commit 时，将当天 changes 文件随本次变更一起暂存和提交

## 第五步：commit（用户要求时执行）

1. **更新 changes**：确保 `docs/changes/YYYY-MM-DD.md` 已覆盖本次变更
2. **展示暂存区统计**：执行 `git status`，列出所有改动文件，区分已暂存和未暂存
3. **询问是否加入暂存区**：询问用户需要将哪些未暂存的改动 `git add`
4. **让用户确认提交**：展示完整的 commit message，**让用户最终确认**后再执行 `git commit`

- commit 格式见 `.agent/rules/core.md` 中的「提交规范」
- **commit 由用户决定**，除非用户明确说"commit"，否则不主动提交

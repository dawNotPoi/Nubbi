# 工作流

```
沟通方案 → 更新 PRD → 编写代码 → review → （用户要求时）更新 changes → commit
```

> 规则约束（commit 格式、changes 更新时机、禁止项等）见 `.agent/rules/core.md`。
> commit 格式和 changes 暂存由 hook 自动校验，agent 可跳过该部分记忆。

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

- 遵循 `.agent/rules/core.md` 中的约束
- 遵循 `.agent/skills/code.md` 中的编码约定
- 遵循 `.agent/skills/style.md` 中的样式约定
- 按 `.agent/module-index.md` 确认文件放置位置

## 第三步：review

代码改动完成后，agent 直接审查当前 diff。
审查清单见 `.agent/skills/review.md`。

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

## 第五步：commit（用户要求时执行）

按 `.agent/rules/core.md` 中「Commit 前必做」四步执行。

- **commit 由用户决定**，除非用户明确说"commit"，否则不主动提交

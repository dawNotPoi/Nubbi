---
name: video-summary
description: 把视频链接（B站/YouTube/抖音/快手等）生成 AI Markdown 笔记。当用户给出视频链接并要总结、做笔记、提取要点时激活。
---

# Video Summary —— 视频链接 → Markdown 笔记

用已配置的 **VideoNote MCP 工具** 处理视频链接，产出结构化 Markdown 笔记。

## 强制规则

1. **必须用 VideoNote MCP 工具**（`validate_url` / `prepare_note_material` / `generate_note` / `get_task_status` / `get_task_transcript` / `cancel_note`），不要用 Bash/curl 手工处理。
2. **先 `validate_url(url)`** 确认平台支持；返回 `handoff: True` 时不重试，改用页面抓取等方式接手。
3. **长视频的转写可能超上下文**：优先用 `fetch_subtitles`（快速拿字幕）；转写用 `get_task_transcript(task_id, segment_range="0-50")` 分段读，避免一次撑爆 context。
4. 异步任务用 **轮询 `get_task_status(task_id)`** 直到 `SUCCESS`，不要用阻塞的 `wait_for_note`。
5. 单视频一次提交一个任务；多视频逐个串行。

## 工作流

1. **`validate_url(url)`** —— 平台识别，确认可用。
2. 确认生成方式（简短问用户，或直接默认）：
   - **快速字幕**：`fetch_subtitles(video_url=url)` 直接拿平台字幕（最快，无需转写）。
   - **完整素材**：`prepare_note_material(video_url=url)` → `task_id` → 轮询 `get_task_status` 到 SUCCESS，取 `frames`/`transcript`。
   - **AI 笔记**：`generate_note(video_url=url, provider_id=..., model_name=..., style=...)` → `task_id` → 轮询到 SUCCESS，取 `result.markdown`。
3. **总结输出 Markdown**，结构建议：
   - `# 标题`
   - `## 概述`（一两句）
   - `## 核心要点`（分点，编号）
   - `## 关键细节`（涉及具体数据/步骤时）
   - `## 结论`（视频想传达的）
   - `## 来源`（原链接）

## 参数提示
- `style` 支持：`minimal` / `detailed` / `academic` / `tutorial` / `xiaohongshu` / `life_journal` / `task_oriented` / `business` / `meeting_minutes`。
- `video_understanding=True` + `video_interval=6` 可抽帧做画面理解（**需多模态模型**）。
- 无字幕视频：`prepare_note_material` / `generate_note` 会自动下载音频并用 Whisper 转写。
- B 站 AI 字幕 / 弹幕评论需 `SESSDATA` 登录；没配就跳过这些，只做转写。

## 报错处理
- `get_task_status` 返回 `FAILED`：读 `message` 说明；常见是没字幕 + 转写失败、平台需登录、链接无效。
- `validate_url` 返回 `handoff`：该平台不在内置支持内，改用 WebFetch/浏览器读取页面提取视频源后再处理。

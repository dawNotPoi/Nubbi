# Phase 4：外部内容接入 PRD

## 模块概述

agent 通过 MCP tool 传入外部 URL，系统自动识别内容类型、抓取正文/字幕、调用 LLM 生成结构化摘要，在指定文件夹下创建 note 并触发 embedding。

---

## 背景

### 使用场景

1. 用户看到一篇好文章，发给 agent："帮我总结这篇文章，存到阅读文件夹"
2. YouTube 视频："总结这个视频，记到 AI 笔记文件夹"
3. PDF 论文/文档：上传或给链接，agent 提取要点归档
4. 评论区/讨论串：某篇 blog 的长讨论有价值，保存下来

### 设计原则

1. **agent 驱动**：用户通过 agent（Claude Desktop / 手机）触发，不是 Web UI 操作
2. **类型识别**：自动判断 URL 是文章、视频还是 PDF
3. **摘要优先**：不存全文（版权风险），存结构化摘要 + 关键点 + 原始链接
4. **权限联动**：Token scope 必须覆盖目标文件夹

---

## 数据流

```
用户/Agent 调用 MCP ingest_url(url, target_folder, title?)
       │
       ▼
  MCP Server
       │
       ├──► 鉴权（检查 write + folder scope）
       │
       ▼
  IngestionService
       │
       ├──► 1. URL 分析（判断类型）
       │    ├─ youtube.com → VideoSource
       │    ├─ arxiv.org → PDFSource
       │    ├─ .pdf 结尾 → PDFSource
       │    └─ 其他 → WebArticleSource
       │
       ├──► 2. 内容提取
       │    ├─ Web: Jina Reader API / Readability
       │    ├─ YouTube: 字幕 Transcript API
       │    └─ PDF: 下载 + PDF.js 提取
       │
       ├──► 3. LLM 结构化摘
       │    └─ 生成: title, summary, tags, key_points[], type
       │
       ├──► 4. 创建 Note
       │    ├─ type = article/video/book
       │    ├─ content = 结构化摘要（Markdown）
       │    └─ meta = { source_url, author, tags, ai_summary, ... }
       │
       ├──► 5. 触发 Embedding（接入 Phase 3）
       │
       └──► 返回 Note ID + 摘要预览
```

---

## MCP Tool

### `ingest_url`

**输入**：
```ts
{
  url: string;
  targetFolderId?: string;   // 目标文件夹 noteId，不传则放在根级
  title?: string;            // 自定义标题，不传则由 LLM 生成
  depth?: 'summary' | 'detailed';  // 摘要深度，默认 'summary'
}
```

**输出**：
```ts
{
  noteId: string;
  title: string;
  type: 'article' | 'video' | 'book';
  summary: string;           // 100–200 字摘要
  tags: string[];
  keyPoints: string[];       // 3–5 个关键要点
  sourceUrl: string;
}
```

---

## 内容源实现

### 1. WebArticleSource（网页文章）

**工具**：Jina Reader API（`https://r.jina.ai/<url>`）

- 优点：免费、自动提取正文、支持各种页面
- 备用：本地 Mozilla Readability（`@mozilla/readability`）+ `jsdom`

```ts
async function extractWebArticle(url: string): Promise<{
  title: string;
  content: string;       // Markdown 正文
  textContent: string;   // 纯文本（用于 LLM 处理）
  author?: string;
  publishedAt?: string;
}> {
  // 主方案：Jina Reader
  const response = await fetch(`https://r.jina.ai/${encodeURIComponent(url)}`, {
    headers: { 'Accept': 'text/markdown' }
  });
  const markdown = await response.text();

  // 从 markdown 中提取 title（通常是第一行 # 标题）
  return parseMarkdownContent(markdown);
}
```

### 2. VideoSource（YouTube 等视频平台）

**YouTube**：使用 `youtube-transcript` npm 包获取字幕。

```ts
async function extractYouTube(videoId: string): Promise<{
  title: string;
  transcript: string;   // 完整字幕文本
  channel: string;
  durationSeconds: number;
}> {
  // 1. 获取视频信息
  const info = await fetchYouTubeInfo(videoId);

  // 2. 获取字幕
  const { YoutubeTranscript } = await import('youtube-transcript');
  const transcript = await YoutubeTranscript.fetchTranscript(videoId);
  const fullText = transcript.map(t => t.text).join(' ');

  return {
    title: info.title,
    transcript: fullText,
    channel: info.channelTitle,
    durationSeconds: info.duration,
  };
}
```

**B 站**：将来可扩展，通过 `bilibili-api`。

### 3. PDFSource（PDF 文档）

```ts
async function extractPDF(url: string): Promise<{
  title: string;
  content: string;
  pageCount: number;
}> {
  // 1. 下载 PDF
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();

  // 2. 提取文本（pdf-parse）
  const pdf = await import('pdf-parse');
  const data = await pdf.default(Buffer.from(buffer));

  return {
    title: data.info?.Title || 'Untitled PDF',
    content: data.text,
    pageCount: data.numpages,
  };
}
```

---

## LLM 摘要生成

提取原始内容后，调用 LLM 生成结构化摘要：

```ts
const SUMMARY_PROMPT = `你是一个笔记整理助手。请根据以下内容生成结构化笔记摘要。

## 输出格式（JSON）

{
  "title": "简洁准确的标题（≤50 字）",
  "summary": "100–200 字的内容概述，抓住核心论点",
  "keyPoints": ["要点1", "要点2", "要点3", "要点4", "要点5"],
  "tags": ["标签1", "标签2", "标签3"],
  "type": "article" | "video" | "book",
  "author": "作者（如有）",
  "language": "zh" | "en" | ...
}

## 原始内容

标题: {sourceTitle}
来源: {sourceUrl}
{contentType === 'video' ? `频道: ${channel}` : ''}

{rawContent}

## 注意
- 摘要要客观，不要添加个人评价
- tags 选择最能概括内容的 3–5 个标签
- 如果内容很长，优先提取开头和结尾的核心论点
- 用与原文相同的语言生成摘要`;
```

---

## Note 创建

LLM 生成摘要后，创建 note：

```ts
async function createIngestionNote(params: {
  userId: string;
  type: NoteType;
  title: string;
  summary: string;
  keyPoints: string[];
  tags: string[];
  sourceUrl: string;
  author?: string;
  language?: string;
  additionalMeta?: Record<string, any>;
  parentId?: string;
}): Promise<string> {
  // 构建 note 内容（Markdown 格式）
  const content = [
    `# ${params.title}`,
    '',
    `> 原文链接: ${params.sourceUrl}`,
    params.author ? `> 作者: ${params.author}` : '',
    '',
    '## 摘要',
    params.summary,
    '',
    '## 关键要点',
    ...params.keyPoints.map((p, i) => `${i + 1}. ${p}`),
    '',
    '---',
    '*此文由 AI 辅助整理，内容可能存在偏差，请参考原文。*',
  ].filter(Boolean).join('\n');

  // 创建 note（通过内部 API）
  const noteId = await noteService.create({
    userId,
    title: params.title,
    content,
    type: params.type,
    parentId: params.parentId,
    meta: {
      source_url: params.sourceUrl,
      author: params.author || undefined,
      tags: params.tags,
      language: params.language || undefined,
      status: 'inbox',
      ai_summary: params.summary,
      ...params.additionalMeta,
    },
  });

  // 触发 embedding
  await embeddingQueue.enqueue(noteId, content);

  return noteId;
}
```

---

## 权限联动

`ingest_url` 的权限检查：

```ts
// 在 MCP tool handler 中
async function handleIngestUrl(params: IngestParams, context: MCPContext) {
  // 1. 检查 write 权限
  checkPermission(context.scope, 'write', [params.targetFolderId || '__ROOT__']);

  // 2. 检查目标文件夹是否在 scope 内
  if (params.targetFolderId) {
    const folderInScope = context.scope.folderIds.includes('*') ||
      context.scope.folderIds.includes(params.targetFolderId);
    if (!folderInScope) {
      throw new MCPError(403, 'Token 未授权目标文件夹');
    }
  }

  // 3. 执行 ingestion...
}
```

---

## 配置

### `.env` 新增

```env
# 内容提取
JINA_READER_URL=https://r.jina.ai

# Ingestion LLM（用于摘要生成）
INGESTION_LLM_PROVIDER=anthropic
INGESTION_LLM_MODEL=claude-haiku-4-5
```

---

## 实施顺序

1. **类型定义**：`mcp/src/tools/ingest-url.ts` 输入输出类型
2. **MCP Tool**：注册 `ingest_url`，含权限检查
3. **WebArticleSource**：`server/app/services/ingestion/web-article.ts`
4. **VideoSource**：`server/app/services/ingestion/youtube.ts`
5. **PDFSource**：`server/app/services/ingestion/pdf.ts`
6. **LLM 摘要**：`server/app/services/ingestion/summarizer.ts`
7. **Ingestion Service**：`server/app/services/ingestion/index.ts` 路由到对应 source
8. **Note 创建**：复用 `/note/create` API 或内部 service
9. **Embedding 触发**：接入 Phase 3 队列

---

## 验收标准

- [ ] MCP `ingest_url` 传入网页 URL，成功创建 type=article 的 note
- [ ] MCP `ingest_url` 传入 YouTube URL，成功创建 type=video 的 note（含字幕摘要）
- [ ] MCP `ingest_url` 传入 PDF URL，成功创建 type=book 的 note
- [ ] 创建的 note 内容包含摘要、关键要点、原始链接
- [ ] meta 中 source_url、author、tags 正确填充
- [ ] 权限不足时返回 403
- [ ] 新建 note 自动触发 embedding
- [ ] 非标准 URL 返回友好错误提示
- [ ] 内容过长时正常截断摘要

---

## 依赖关系

- 依赖 **Phase 1**（结构化 meta）
- 依赖 **Phase 2**（MCP Token 鉴权 + scope 控制）
- 依赖 **Phase 3**（创建 note 后触发 embedding）
- 依赖 **note** 模块（创建笔记）

---

## 估时

**1.5 周**（约 7–8 个工作日）

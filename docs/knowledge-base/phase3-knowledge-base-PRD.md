# Phase 3：知识库 RAG PRD

## 模块概述

基于 note 内容构建向量知识库，使 agent 能够通过语义搜索检索相关笔记片段，由 LLM 生成带来源引用的回答。核心目标是让 agent 能"读自己的笔记回答问题"，同时严格避免幻觉。

---

## 背景

### 现状问题

- 笔记只有 MongoDB 的全文搜索（关键词匹配），无法做语义搜索
- agent 无法"理解"用户的笔记内容来回答问题
- 没有向量检索能力，无法做 RAG

### 设计原则

1. **每用户隔离**：Collection 按 `notes_{userId}` 划分，用户间数据严格隔离
2. **引用强制**：每段回答必须有 noteId + 原文摘录，无引用=无回答
3. **相似度门槛**：低于阈值的片段不进 context，宁愿说"不知道"也不瞎编
4. **异步处理**：embedding 不阻塞笔记的创建/更新 API
5. **可后期切换模型**：embedding 和生成 LLM 都是可配置的，后续可加 Ollama

---

## 架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                      数据写入流                               │
│                                                             │
│  用户/Agent 创建/更新 Note                                     │
│       │                                                     │
│       ▼                                                     │
│  Server API                                                 │
│       │                                                     │
│       ├──► 保存 MongoDB（同步）                                │
│       └──► 推入 Embedding Queue（异步）                        │
│                │                                            │
│                ▼                                            │
│           ChunkService                                       │
│           ├─ 按段落切片（≤512 token）                          │
│           └─ 保留上下文重叠（前后各 50 token）                   │
│                │                                            │
│                ▼                                            │
│           EmbeddingProvider                                  │
│           ├─ Voyage AI / OpenAI / (Ollama)                   │
│           └─ text → number[]                                 │
│                │                                            │
│                ▼                                            │
│           Qdrant                                             │
│           └─ upsert points to notes_{userId}                 │
│                                                             │
│           NoteEmbedding（MongoDB）                             │
│           └─ 记录状态: done / error                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      查询流                                  │
│                                                             │
│  用户 或 Agent 提问                                          │
│       │                                                     │
│       ▼                                                     │
│  POST /kb/ask 或 MCP ask_kb                                 │
│       │                                                     │
│       ├──► EmbeddingProvider.embed(query)                    │
│       │                                                     │
│       ├──► Qdrant.search(notes_{userId}, vector, topK=10)   │
│       │                                                     │
│       ├──► SimilarityFilter (threshold ≥ 0.7)               │
│       │    └─ 全部低于阈值 → 返回 "无相关内容"                  │
│       │                                                     │
│       ├──► 拼装 Context                                     │
│       │    └─ [片段 source: note标题 + 路径 + 原文]            │
│       │                                                     │
│       ├──► Claude haiku-4-5 生成回答                         │
│       │    └─ System Prompt: 只能基于 Context，强制附加 sources│
│       │                                                     │
│       └──► 返回结构化回答 + 来源引用                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 新增 Docker 服务

### `docker-compose.yml` 新增

```yaml
qdrant:
  image: qdrant/qdrant:v1.14
  ports:
    - "6333:6333/tcp"
    - "6334:6334/tcp"    # gRPC（可选，内部使用）
  volumes:
    - qdrant_data:/qdrant/storage
  environment:
    QDRANT__SERVICE__GRPC_PORT: "6334"
  restart: unless-stopped

volumes:
  qdrant_data:
  server_storage:
```

---

## 数据模型

### MongoDB：`NoteEmbedding`（`server/app/models/noteEmbedding.ts`）

追踪每条 note 的 embedding 状态，用于队列恢复和状态查询。

```ts
import mongoose from "@/lib/db";

const noteEmbeddingSchema = new mongoose.Schema(
  {
    noteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Note",
      required: true,
      unique: true,        // 一条 note 只有一条追踪记录
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'done', 'error'],
      default: 'pending',
    },
    chunkCount: {
      type: Number,
      default: 0,
    },
    embeddingModel: {
      type: String,
      default: '',           // 如 'voyage-3'、'text-embedding-3-small'
    },
    errorMessage: {
      type: String,
      default: '',
    },
    embeddedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("NoteEmbedding", noteEmbeddingSchema);
```

### Qdrant 数据结构

**Collection 命名**：`notes_{userId}`（如 `notes_user_abc123`）

**Point 结构**：
```ts
{
  id: number | string,       // 使用 `${noteId}_${chunkIndex}` 作为 id
  vector: number[],          // 1024 维 (Voyage) 或 1536 维 (OpenAI)
  payload: {
    note_id: string,         // 引用回 Note._id
    chunk_index: number,     // 第几段
    text: string,            // 原文片段
    note_title: string,      // 笔记标题
    note_path: string[],     // 祖先路径 ["文件夹A", "笔记B"]
    note_type: string,       // raw/article/video/book/link
    note_tags: string[],     // 标签
    updated_at: string,      // ISO 时间，用于过滤过期数据
  }
}
```

**Qdrant Index 配置**：
```json
{
  "vectors": {
    "size": 1024,
    "distance": "Cosine"
  },
  "optimizers_config": {
    "default_segment_number": 2
  }
}
```

---

## 核心服务

### 目录结构

```
server/app/services/embedding/
├── index.ts              # 导出 embedNote(), embedBatch()
├── provider.ts           # EmbeddingProvider 接口 & 实现
├── queue.ts              # 内存队列（Bull/BullMQ 太重，用简单实现）
├── chunker.ts            # 文本切片逻辑
└── types.ts              # 类型定义

server/app/services/kb/
├── index.ts              # 导出 ask()
├── qdrant.ts             # Qdrant 客户端封装
├── retriever.ts          # 向量检索 + 重排序
└── answerer.ts           # LLM 生成回答 + 防幻觉 prompt
```

### `server/app/services/embedding/chunker.ts`

文本切片策略：

```ts
/**
 * 将 note 内容切分为多个 chunk
 *
 * 策略：
 * 1. 按 HTML 标签或 Markdown 段落分块（`</p>`, `</h1>`, `\n\n` 等）
 * 2. 每块 ≤ 512 token（约 2000 中文字符）
 * 3. 块间重叠 50 token 上下文
 * 4. 太短的块（< 20 token）合并到上一块
 */
function chunkText(text: string, options?: {
  maxTokens?: number;      // 默认 512
  overlapTokens?: number;  // 默认 50
  minTokens?: number;      // 默认 20
}): Chunk[]

interface Chunk {
  index: number;
  text: string;
  tokenCount: number;      // 估算
}
```

**实现细节**：
- 如果 content 是 HTML（Tiptap 输出），先用 `cheerio` 提取纯文本
- 中文 token 估算：`text.length * 0.5`（约 2 字符 = 1 token）
- 英文 token 估算：`text.split(/\s+/).length * 1.3`

### `server/app/services/embedding/provider.ts`

统一接口，支持多个后端：

```ts
interface EmbeddingProvider {
  name: string;
  dimension: number;
  embed(texts: string[]): Promise<number[][]>;
  embedSingle(text: string): Promise<number[]>;
}

// Voyage AI 实现
class VoyageProvider implements EmbeddingProvider {
  name = 'voyage-3';
  dimension = 1024;

  async embed(texts: string[]): Promise<number[][]> {
    const response = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.VOYAGE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'voyage-3',
        input: texts,
        input_type: 'document',
      }),
    });
    const data = await response.json();
    return data.data.map((d: any) => d.embedding);
  }
}

// OpenAI 实现
class OpenAIProvider implements EmbeddingProvider {
  name = 'text-embedding-3-small';
  dimension = 1536;

  async embed(texts: string[]): Promise<number[][]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: texts,
      }),
    });
    const data = await response.json();
    return data.data.map((d: any) => d.embedding);
  }
}

// 工厂函数
function createProvider(): EmbeddingProvider {
  const provider = env.EMBEDDING_PROVIDER || 'voyage';
  switch (provider) {
    case 'voyage': return new VoyageProvider();
    case 'openai': return new OpenAIProvider();
    // 将来: case 'ollama': return new OllamaProvider();
    default: throw new Error(`Unknown embedding provider: ${provider}`);
  }
}
```

### `server/app/services/embedding/queue.ts`

内存队列实现，不引入 Redis。服务重启后通过 `NoteEmbedding` 表恢复 pending 任务。

```ts
class EmbeddingQueue {
  private processing = false;
  private concurrency = 3;  // 并发数，避免触发 API rate limit

  /**
   * 推入单条 note 的 embedding 任务
   * 在 note 创建/更新 API 中调用，不阻塞响应
   */
  async enqueue(noteId: string, content: string): Promise<void> {
    await NoteEmbedding.findOneAndUpdate(
      { noteId },
      { $set: { status: 'pending', errorMessage: '' } },
      { upsert: true }
    );
    this.processNext();  // 异步触发
  }

  /**
   * 处理队列中的 pending 任务
   */
  private async processNext(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      const pending = await NoteEmbedding.find({ status: 'pending' })
        .limit(this.concurrency);

      await Promise.all(pending.map(doc => this.processNote(doc)));
    } finally {
      this.processing = false;
    }
  }

  private async processNote(doc: NoteEmbeddingDoc): Promise<void> {
    // 1. 标记 processing
    await NoteEmbedding.findByIdAndUpdate(doc._id, { status: 'processing' });

    try {
      // 2. 获取 note 内容
      const note = await Note.findById(doc.noteId);
      if (!note) throw new Error('Note not found');

      // 3. 删除旧的 chunks（Qdrant）
      await qdrant.deleteByNoteId(doc.noteId, doc.userId);

      // 4. 切片
      const chunks = chunkText(note.content);

      // 5. Embedding
      const provider = createProvider();
      const texts = chunks.map(c => c.text);
      const vectors = await provider.embed(texts);

      // 6. 写入 Qdrant
      await qdrant.upsertPoints(doc.userId, chunks.map((chunk, i) => ({
        id: `${doc.noteId}_${chunk.index}`,
        vector: vectors[i],
        payload: {
          note_id: doc.noteId.toString(),
          chunk_index: chunk.index,
          text: chunk.text,
          note_title: note.title,
          note_path: [],  // 由调用方传入或计算
          note_type: note.type,
          note_tags: note.meta?.tags || [],
          updated_at: new Date().toISOString(),
        },
      })));

      // 7. 标记 done
      await NoteEmbedding.findByIdAndUpdate(doc._id, {
        status: 'done',
        chunkCount: chunks.length,
        embeddingModel: provider.name,
        embeddedAt: new Date(),
        errorMessage: '',
      });

    } catch (err: any) {
      await NoteEmbedding.findByIdAndUpdate(doc._id, {
        status: 'error',
        errorMessage: err.message || 'Unknown error',
      });
      console.error(`[Embedding] 处理 note ${doc.noteId} 失败:`, err);
    }
  }

  /**
   * 批量处理全部 note（初次部署时调用）
   */
  async enqueueAll(userId: string): Promise<void> {
    const notes = await Note.find({ userId });
    for (const note of notes) {
      await this.enqueue(note._id.toString(), note.content);
    }
  }
}

export const embeddingQueue = new EmbeddingQueue();
```

### `server/app/services/kb/qdrant.ts`

Qdrant 客户端封装（使用 `@qdrant/js-client-rest`）：

```ts
import { QdrantClient } from '@qdrant/js-client-rest';

const client = new QdrantClient({ url: env.QDRANT_URL || 'http://qdrant:6333' });

export const qdrant = {
  /**
   * 确保用户的 collection 存在（不存在则创建）
   */
  async ensureCollection(userId: string): Promise<void> {
    const collectionName = `notes_${userId}`;
    const exists = await client.collectionExists(collectionName);
    if (!exists) {
      await client.createCollection(collectionName, {
        vectors: {
          size: createProvider().dimension,
          distance: 'Cosine',
        },
      });
    }
  },

  /**
   * Upsert points（创建或更新）
   */
  async upsertPoints(
    userId: string,
    points: Array<{
      id: string;
      vector: number[];
      payload: Record<string, any>;
    }>
  ): Promise<void> {
    await this.ensureCollection(userId);
    await client.upsert(`notes_${userId}`, {
      wait: true,
      points: points.map(p => ({
        id: p.id,
        vector: p.vector,
        payload: p.payload,
      })),
    });
  },

  /**
   * 向量检索
   */
  async search(
    userId: string,
    vector: number[],
    topK: number = 10,
    filters?: {
      folderId?: string;
      noteType?: string;
      tags?: string[];
    }
  ): Promise<SearchResult[]> {
    await this.ensureCollection(userId);

    const must: any[] = [];
    if (filters?.folderId) {
      must.push({ key: 'note_path', match: { any: [filters.folderId] } });
    }
    if (filters?.noteType) {
      must.push({ key: 'note_type', match: { value: filters.noteType } });
    }

    const results = await client.search(`notes_${userId}`, {
      vector,
      limit: topK,
      filter: must.length > 0 ? { must } : undefined,
      with_payload: true,
      score_threshold: env.KB_SIMILARITY_THRESHOLD || 0.7,
    });

    return results.map(r => ({
      id: r.id as string,
      score: r.score,
      payload: r.payload as any,
    }));
  },

  /**
   * 删除指定 note 的所有 chunks
   */
  async deleteByNoteId(noteId: string, userId: string): Promise<void> {
    await this.ensureCollection(userId);
    await client.delete(`notes_${userId}`, {
      filter: { must: [{ key: 'note_id', match: { value: noteId } }] },
      wait: true,
    });
  },
};
```

### `server/app/services/kb/retriever.ts`

向量检索 + 重排序（rerank）：

```ts
async function retrieve(
  userId: string,
  query: string,
  options?: {
    topK?: number;
    folderId?: string;
    noteType?: string;
  }
): Promise<SearchResult[]> {
  const provider = createProvider();
  const queryVector = await provider.embedSingle(query);

  const results = await qdrant.search(
    userId,
    queryVector,
    options?.topK || 10,
    {
      folderId: options?.folderId,
      noteType: options?.noteType,
    }
  );

  // 相似度阈值已在 Qdrant 查询层设置
  return results;
}
```

### `server/app/services/kb/answerer.ts`

LLM 生成回答，核心防幻觉 prompt：

```ts
async function generateAnswer(
  query: string,
  context: SearchResult[]
): Promise<KBAnswer> {
  if (context.length === 0) {
    return {
      answer: '知识库中暂无相关内容。',
      sources: [],
      confidence: 'low',
      hasRelevantContent: false,
    };
  }

  // 拼装 context
  const contextText = context.map((c, i) =>
    `[${i + 1}] 来源: 《${c.payload.note_title}》\n` +
    `路径: ${(c.payload.note_path || []).join(' > ') || '根目录'}\n` +
    `内容: ${c.payload.text}\n`
  ).join('\n---\n');

  // 调用 LLM
  const systemPrompt = `你是用户的知识库助手。你只能基于下面提供的笔记内容回答问题。

## 规则（必须严格遵守）

1. **只能使用提供的 Context 中的信息**。如果信息不足以回答问题，直接说"知识库中暂无相关内容"。
2. **禁止编造**：不得补充未在 Context 中出现的事实、数据、人名、日期。
3. **必须标注引用**：每个事实陈述后标注来源编号 [1]、[2] 等。
4. **不确定时明说**：如果 Context 有信息但不完整，说明"根据笔记记载，[X]，但 [Y] 部分未找到记录"。

## 输出格式

请用 JSON 格式输出：
{
  "answer": "回答正文，含 [1][2] 引用标记",
  "confidence": "high" | "medium" | "low",
  "hasRelevantContent": true
}

## Context

${contextText}`;

  const response = await callLLM(systemPrompt, query);
  // 解析 JSON 响应
  const parsed = JSON.parse(response);

  return {
    answer: parsed.answer,
    sources: context.map(c => ({
      noteId: c.payload.note_id,
      title: c.payload.note_title,
      excerpt: c.payload.text.substring(0, 200),
      path: c.payload.note_path || [],
    })),
    confidence: parsed.confidence,
    hasRelevantContent: parsed.hasRelevantContent,
  };
}
```

---

## API

### `POST /kb/ask`

知识库问答端点。

**请求**（需登录或 MCP Token）：
```json
{
  "question": "什么是 RAG？",
  "scopeFolderId": null,
  "topK": 10
}
```

**响应**：
```json
{
  "answer": "根据笔记记载，RAG（Retrieval-Augmented Generation）是一种结合检索和生成的 AI 架构 [1]...",
  "sources": [
    {
      "noteId": "64a1b2c3d4e5f6...",
      "title": "RAG 学习笔记",
      "excerpt": "RAG 是一种将信息检索与文本生成相结合的 AI 技术架构...",
      "path": ["AI", "LLM"]
    }
  ],
  "confidence": "high",
  "hasRelevantContent": true
}
```

### `POST /kb/reindex`

手动触发重新索引（管理员/用户）。

**请求**：
```json
{
  "noteId": "..."  // 可选，不传则重建全部
}
```

---

## 配置

### `server/.env` 新增

```env
# Embedding 提供商
EMBEDDING_PROVIDER=voyage          # voyage | openai（将来: ollama）
VOYAGE_API_KEY=your_key_here
# 如果用 OpenAI
OPENAI_API_KEY=your_key_here

# Qdrant
QDRANT_URL=http://qdrant:6333

# 知识库检索
KB_SIMILARITY_THRESHOLD=0.7
KB_TOP_K=10
KB_MAX_CONTEXT_CHARS=8000

# LLM 生成（用于回答）
KB_LLM_PROVIDER=anthropic          # anthropic | openai
ANTHROPIC_API_KEY=your_key_here
KB_LLM_MODEL=claude-haiku-4-5      # 轻量模型，成本低、速度快
```

---

## 防幻觉措施总结

| 层级 | 措施 | 说明 |
|------|------|------|
| 检索层 | 相似度阈值 0.7 | 低于阈值不进 context |
| Context 层 | 最大字符限制 8000 | 防止超出 LLM 上下文窗口 |
| Prompt 层 | 强制只能基于 Context | System Prompt 写入硬性规则 |
| 输出层 | 强制 sources 数组 | 每个回答必须带来源引用 |
| 降级层 | 无内容明确告知 | `hasRelevantContent: false` 时不生成回答 |
| 展现层 | 来源卡片 | 前端/MCP 输出必须渲染来源链接 |

---

## 实施顺序

1. **docker-compose**：新增 qdrant 服务
2. **依赖**：`server/package.json` 新增 `@qdrant/js-client-rest`
3. **类型**：`server/app/services/embedding/types.ts`
4. **Chunker**：`server/app/services/embedding/chunker.ts`
5. **Provider**：`server/app/services/embedding/provider.ts`
6. **Queue**：`server/app/services/embedding/queue.ts`
7. **Embedding Service**：`server/app/services/embedding/index.ts`
8. **NoteEmbedding Model**：`server/app/models/noteEmbedding.ts`
9. **Qdrant Client**：`server/app/services/kb/qdrant.ts`
10. **Retriever**：`server/app/services/kb/retriever.ts`
11. **Answerer**：`server/app/services/kb/answerer.ts`
12. **KB Route**：`server/app/routes/kb.ts`
13. **Note Hook**：在 note 创建/更新 API 中调用 `embeddingQueue.enqueue()`
14. **MCP ask_kb**：激活 `mcp/src/tools/ask-kb.ts`
15. **批量索引**：初次部署后执行全量 embedding

---

## 验收标准

- [ ] docker-compose up 后 Qdrant 正常运行
- [ ] 创建/更新 note 后自动触发 embedding（异步）
- [ ] `POST /kb/ask` 返回带引用的回答
- [ ] 语义搜索能匹配到相关笔记（同义词、近义表达）
- [ ] 回答中包含 `[1]` `[2]` 引用标记
- [ ] 返回的 sources 数组包含正确的 noteId、标题、原文摘录
- [ ] 提问无关内容时返回 "知识库中暂无相关内容"
- [ ] 回答不包含 context 之外的信息（抽查验证）
- [ ] 删除笔记后 Qdrant 中对应 chunk 同步删除
- [ ] MCP `ask_kb` tool 正常工作
- [ ] Embedding 失败时 NoteEmbedding 状态为 error，不影响笔记正常读写
- [ ] 批量重建索引可正常执行

---

## 依赖关系

- 依赖 **Phase 1**（结构化 meta，作为 Qdrant payload 的一部分）
- 依赖 **Phase 2**（MCP `ask_kb` tool 通过 `/kb/ask` 实现）
- 依赖 **note** 模块（嵌入 note 创建/更新流程）
- 被 **Phase 4**（ingest_url 生成 note 后触发 embedding）依赖

---

## 估时

**2 周**（约 10 个工作日）

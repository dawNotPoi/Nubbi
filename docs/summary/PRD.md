# 摘要模块 PRD

## 模块概述

笔记摘要服务，通过 noteId 与笔记一对一关联。

**服务端**: `server/app/routes/summary/` + `server/app/controller/summary.ts` + `server/app/models/summary.ts`

---

## 数据模型

```
Summary {
  content:   string    // 摘要内容
  noteId:    string    // 关联笔记 ID（unique）
  createdAt: Date
  updatedAt: Date
}
```

---

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/summary/create` | 创建摘要。body: `{ noteId, content }` |
| POST | `/summary/find` | 查询摘要。body: `{ noteId }` |

两个端点都要求认证。服务端必须使用当前认证用户校验 `noteId` 的笔记归属，
禁止客户端通过空条件查询或写入其他用户的摘要。

---

## 控制器

| 函数 | 文件 | 说明 |
|------|------|------|
| `createSummary` | `server/app/controller/summary.ts` | 按 noteId 原子创建或更新 |
| `findSummary` | `server/app/controller/summary.ts` | 按 noteId 查询 |

---

## 设计说明

摘要和笔记是一对一关系，noteId 为 unique 索引。当前实现为手动创建/查询摘要，后续可接入 AI 自动生成。

笔记永久删除或账号注销时同步删除关联摘要，避免留下孤儿数据。

---

## 如何扩展

### 接入 AI 自动生成
1. 在 `createSummary` 中添加 AI 调用逻辑
2. 监听笔记内容变更事件，自动触发摘要生成
3. 通过 WebSocket 推送摘要生成完成通知

---

## 依赖关系

- 依赖 **note** 模块（通过 noteId 关联）

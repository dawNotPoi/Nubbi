# 图片模块 PRD

## 模块概述

图片存储和 GitHub 图床上传服务。笔记编辑器中的图片通过此模块上传到 GitHub 仓库。

**服务端**: `server/app/routes/image.ts` + `server/app/models/image.ts`

---

## 数据模型

```
Image {
  name:      string    // 图片名称
  type:      string    // MIME 类型（如 image/png）
  content:   string    // 图片 URL（GitHub raw URL）
  createdAt: Date
  updatedAt: Date
}
```

---

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/image/create` | 创建图片记录 |
| GET | `/image/get` | 获取图片 |
| DELETE | `/image/delete` | 删除图片 |
| POST | `/image/github` | 上传图片到 GitHub 图床，返回 raw URL |

---

## 上传流程

```
客户端选择图片
  → POST /image/github (FormData)
  → 服务端将图片转为 base64，通过 GitHub API 写入仓库
  → 返回 GitHub raw URL
  → 前端将 URL 插入笔记内容
```

---

## 环境变量

| 变量 | 说明 |
|------|------|
| `GITHUB_TOKEN` | GitHub Personal Access Token |
| `GITHUB_REPO` | 图床仓库（如 `user/images`） |
| `GITHUB_BRANCH` | 目标分支 |

---

## 前端调用

在 Tiptap 编辑器中，图片粘贴/拖拽时通过 `ImgToGitupload` 组件调用此 API：

```
component/upload/ImgToGitupload → client/src/api/image.ts → POST /image/github
```

---

## 如何开发新功能

### 支持更多图床
1. 在 `server/app/routes/image.ts` 添加新的上传端点
2. 实现对应图床的 API 调用（如 S3、七牛、Cloudinary）
3. 在前端添加图床选择 UI

---

## 依赖关系

- 被 **note** 模块调用（笔记内嵌图片）
- 依赖 GitHub API
- 需要 `GITHUB_TOKEN` 环境变量

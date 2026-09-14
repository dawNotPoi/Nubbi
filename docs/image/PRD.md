# 图片模块 PRD

## 模块概述

图片存储和 GitHub 图床上传服务。笔记编辑器中的图片通过此模块上传到 GitHub 仓库。

**服务端**: `server/app/routes/image/` + `server/app/controller/image.ts` + `server/app/models/image.ts`

---

## 数据模型

```
Image {
  name:      string    // 图片名称
  type:      string    // MIME 类型（如 image/png）
  content:   string    // 图片 URL（GitHub raw URL）
  ownerId:   string    // 所属用户
  provider:  'github'
  remotePath: string   // GitHub 仓库路径
  remoteSha:  string   // 删除远端对象所需版本
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

所有端点都要求认证。图片记录的新增、查询和删除必须带入当前用户
`ownerId` 作为查询条件，不能仅凭图片 ID 跨用户访问。

---

## 上传流程

```
客户端选择图片
  → POST /image/github (FormData)
  → 服务端先校验登录态、图片 MIME 和 5MB 大小上限
  → 服务端将图片转为 base64，通过 GitHub API 写入仓库
  → 保存 ownerId、remotePath 和 remoteSha 归属记录
  → 返回 GitHub raw URL
  → 前端将 URL 插入笔记内容
```

删除图片记录或注销账号时，服务端先写入持久化远端清理任务，再删除数据库
引用。GitHub DELETE 失败不会丢失任务，后台维护每小时重试；确认仍有图片
记录引用同一路径时不会删除远端对象。

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
component/upload/ImgToGitupload → client/src/api/fileAccess.ts → POST /image/github
```

---

## 如何开发新功能

### 支持更多图床
1. 在 `server/app/routes/image/` 添加请求 Schema 和路由声明
2. 在 `server/app/services/image/` 实现对应存储适配和可重试清理
3. 在前端添加图床选择 UI

---

## 依赖关系

- 被 **note** 模块调用（笔记内嵌图片）
- 依赖 GitHub API
- 需要 `GH_IMAGE_REPO` 和 `GH_IMAGE_TOKEN` 环境变量
- GitHub 上游异常统一映射为网关错误，不能伪装成当前用户的 401

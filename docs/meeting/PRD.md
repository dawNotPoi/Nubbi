# 会议模块 PRD

## 模块概述

在线会议系统，支持会议 CRUD、P2P 视频通话（WebRTC）、实时聊天评论、会议密码保护。

**服务端**: `server/app/routes/meeting.ts` + `server/app/models/meeting.ts` + `server/app/socket/P2PHandler.ts`
**客户端**: `client/src/views/meetings/`（会议列表） + `client/src/views/meeting-room/`（视频会议室）

---

## 数据模型

### Meeting
```
{
  title:     string        // 会议标题
  hostId:    string        // 主持人 ID
  startTime: Date          // 开始时间
  duration:  number        // 时长（分钟）
  password:  string        // 入会密码
  endedAt:   Date | null   // 结束时间（过期自动结束）
  status:    'unreviewd' | 'approved' | 'rejected'
  createdAt: Date
  updatedAt: Date
}
```

### MeetingComment
```
{
  meetingId: ObjectId      // 关联会议
  roomId:    string        // 房间 ID
  content:   string        // 评论内容
  userId:    string        // 发送者 ID
  name:      string        // 发送者名称
  avatar:    string        // 发送者头像
  email:     string        // 发送者邮箱
  createdAt: Date
  updatedAt: Date
}
```

---

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/meeting/create` | 创建会议。body: `{ title, startTime, duration, password? }` |
| GET | `/meeting/findMyMeeting` | 我的会议列表 |
| GET | `/meeting/list` | 鉴权后的规范化分页查询。query: `{ limit?, offset? }` |
| POST | `/meeting/findByPage` | 鉴权后的旧版分页查询，暂作为兼容入口；仅允许标量白名单筛选 |
| GET | `/meeting/findAllMeeting` | 所有会议 |
| GET | `/meeting/findById` | 按 ID 查询。query: `id` |
| DELETE | `/meeting/delete` | 鉴权后删除会议。query: `_id` |
| POST | `/meeting/vetMeeting` | 审核会议（approve/reject） |
| POST | `/meeting/validateAccess` | 验证入会密码。body: `{ id, password }` |
| GET | `/meeting/comments` | 获取评论。query: `id` |

内部列表接口统一采用 `limit/offset`：`limit` 默认 20、范围 1–50，`offset` 默认 0；响应 `data` 为 `{ items, total, count, limit, offset, hasMore, nextOffset }`。会议读取 DTO 不返回明文 `password`，只返回 `hasPassword`；旧 `/meeting/findByPage` 暂保留原分页包裹结构作为兼容入口。

---

## 客户端页面

### 会议列表 `/meetings`
- `client/src/views/meetings/` — 会议列表、创建会议
- 使用组件：`component/MeetingList/`（Meetingmanage, RecentMeeting, MeetingSchedule, addMeeting）

### 视频会议室 `/meeting/:roomId`
- `client/src/views/meeting-room/index.tsx` — 主视频组件
- `client/src/views/meeting-room/MeetingAccessGuard.tsx` — 密码校验守卫
- 子组件：`MainVideoStage`, `ParticipantSidebar`, `ParticipantTile`, `VideoControls`, `CommentPanel`

---

## 实时通信（Socket.IO + WebRTC）

### P2P 信令事件
| 事件 | 方向 | 说明 |
|------|------|------|
| `joinMeetingRoom` | Client → Server | 加入会议室 |
| `signal` | Client ↔ Server | WebRTC 信令数据转发 |
| `endMeeting` | Client → Server | 主持人结束会议 |
| `sendMeetingComment` | Client → Server | 发送聊天消息 |
| `syncMeetingUser` | Server → Client | 同步在线用户列表 |

### 客户端 Hooks
| Hook | 路径 | 用途 |
|------|------|------|
| `useMediaStream` | `views/meeting-room/` | 管理本地摄像头/麦克风 |
| `useP2PConnection` | `views/meeting-room/` | 管理 WebRTC peer 连接 |

---

## 可复用组件

| 组件 | 路径 | 用途 |
|------|------|------|
| Meetingmanage | `component/MeetingList/` | 会议管理列表 |
| RecentMeeting | `component/MeetingList/` | 最近会议卡片 |
| MeetingSchedule | `component/MeetingList/` | 会议时间表 |
| addMeeting | `component/MeetingList/` | 创建会议表单 |

---

## 如何开发新功能

### 添加会议交互能力
1. 在 `server/app/socket/` 添加新的事件处理
2. 在客户端对应 hook 中添加事件监听
3. 更新 UI 组件响应新事件

### 扩展评论功能
1. 修改 `server/app/models/meetingComment.ts`（如需新字段）
2. 在 `server/app/routes/meeting.ts` 添加新端点
3. 更新 `client/src/views/meeting-room/CommentPanel.tsx`

---

## 依赖关系

- 依赖 **auth** 模块（认证）
- 依赖 **socket**（P2P 信令）
- 客户端依赖 `simple-peer`（WebRTC 实现）

## 移动端行为

- 会议列表、统计和操作卡片在 `768px` 以下采用单列布局，关键动作不依赖 hover。
- 视频会议室支持竖屏与横屏：主画面优先，成员与评论按需显示为抽屉或底部面板。
- 移动控制栏保留麦克风、摄像头、共享、成员、评论与离开/结束会议，并适配底部安全区。
- 评论输入位于评论面板内，避免与虚拟键盘及固定控制栏冲突。

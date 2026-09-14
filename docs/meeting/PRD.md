# 会议模块 PRD

## 模块概述

在线会议系统，支持会议 CRUD、P2P 视频通话（WebRTC）、实时聊天评论、会议密码保护。

**服务端**: `server/app/routes/meeting/` + `server/app/controller/meeting/` + `server/app/models/meeting*.ts` + `server/app/socket/meeting/`
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
  passwordHash: string     // scrypt 入会密码哈希
  password?: string        // 仅兼容旧数据，首次成功验证后清空
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
| DELETE | `/meeting/delete` | 主持人删除自己的会议。query: `_id` |
| POST | `/meeting/vetMeeting` | 主持人变更自己会议的兼容状态入口 |
| POST | `/meeting/validateAccess` | 登录用户验证入会密码并取得有效期覆盖当前会议生命周期的入会凭证。body: `{ id, password }` |
| GET | `/meeting/comments` | 主持人获取自己会议的历史评论。query: `id` |

内部列表接口统一采用 `limit/offset`：`limit` 默认 20、范围 1–50，`offset` 默认 0；响应 `data` 为 `{ items, total, count, limit, offset, hasMore, nextOffset }`。会议读取 DTO 不返回 `password` 或 `passwordHash`，只返回 `hasPassword`；旧 `/meeting/findByPage` 暂保留原分页包裹结构作为兼容入口。

项目当前没有管理员角色模型，因此审核、删除和历史评论不能仅凭“已登录”
授权。`vetMeeting` 暂按主持人归属保护；未来引入管理员角色后再替换为明确的
管理员策略。

---

## 客户端页面

### 会议列表 `/meetings`
- `client/src/views/meetings/` — 会议列表、创建会议
- 页面采用统一的蓝灰主题：顶部展示页面标题、说明和创建会议主操作，下面依次展示近期会议与会议管理。
- 使用组件：`component/MeetingList/`（Meetingmanage, RecentMeeting, CreateMeetingModal, MeetingSchedule, addMeeting）

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
| `syncMeetingUser` | Client → Server | 同步自己的媒体状态 |
| `room-users-sync` | Server → Client | 广播服务端维护的在线用户列表 |

### 实时权限约定

- 当前产品不支持游客入会；Socket 握手必须携带有效 Session/JWT。
- `/meeting/validateAccess` 成功后返回绑定 `meetingId + userId`、且不超过会议结束时间的签名凭证。
- `joinMeetingRoom` 必须携带该凭证；服务端再次校验会议状态和结束时间。
- 信令只能发给同一房间成员，评论和结束会议都要求调用者已加入对应房间。
- 评论身份完全取自服务端认证用户，不接受客户端自报的用户 ID、姓名或邮箱。
- 房间成员和评论响应不广播邮箱，只返回显示所需的用户 ID、名称和头像。
- 评论写入持有会议级栅栏；删除会议或注销主持人账号会先关闭该会议并等待在途评论完成，避免删除后写回孤儿评论。
- 只有主持人可以结束会议，数据库更新同时带 `hostId` 条件。
- 入会密码使用 scrypt 哈希；旧明文记录在首次成功校验后自动升级。
- 密码失败按 `meetingId + userId` 和会议总量限流，避免持续暴力尝试。
- 会议到期由房间计时器关闭；拒绝或删除会议会广播关闭，敏感实时事件还会二次检查会议状态。
- Socket 断线重连后客户端自动使用原入会凭证重新加入；凭证失效时退回访问校验。
- Socket ack 在调用前做运行时函数校验，离开成员时销毁对应 WebRTC Peer。

### 客户端 Hooks
| Hook | 路径 | 用途 |
|------|------|------|
| `useMediaStream` | `views/meeting-room/` | 管理本地摄像头/麦克风 |
| `useP2PConnection` | `client/src/hooks/useP2PConnection.ts` | 管理 WebRTC peer 连接与断线重入 |

---

## 可复用组件

| 组件 | 路径 | 用途 |
|------|------|------|
| Meetingmanage | `component/MeetingList/` | 会议管理列表 |
| RecentMeeting | `component/MeetingList/` | 最近会议卡片 |
| CreateMeetingModal | `component/MeetingList/` | 会议页与首页共用的创建会议弹窗 |
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
2. 在 `server/app/routes/meeting/` 添加 Schema 和类型化路由声明，并在 `server/app/controller/meeting/` 实现用例
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

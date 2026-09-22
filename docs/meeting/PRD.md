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

项目采用多用户、单一普通用户身份，不设置系统管理员，因此状态变更、删除和
历史评论不能仅凭“已登录”授权。`vetMeeting` 保留现有主持人归属校验，主持人
是会议内职责而非系统管理员；认证重构不新增管理员审核流程。

---

## 客户端页面

### 会议列表 `/meetings`
- `client/src/views/meetings/` — 会议列表、创建会议
- 页面采用统一的蓝灰主题：顶部展示页面标题、说明和创建会议主操作，下面依次展示近期会议与会议管理。
- 使用组件：`component/MeetingList/`（Meetingmanage, RecentMeeting, CreateMeetingModal, MeetingSchedule, addMeeting）
- 创建会议表单契约（`CreateMeetingModal`；`addMeeting` 仅作入口转发）：标题必填；开始时间使用本地 `datetime-local` 输入，`min` 取「当前时间 − 5 分钟」，提交前按同一宽限再校验一次，不得创建早于当前时间的会议；提交时把本地时间转成 `startTime` 毫秒时间戳；时长用受控下拉（30/45/60/120 分钟）；密码可选，不参与时间校验。
- 5 分钟宽限的理由：弹窗打开时默认填入当前时刻，用户填写标题后默认值已略早于提交时刻；若选择器下限与提交校验都用严格的 `now`，会拦掉合法默认值。两处必须共用同一宽限值，避免口径不一致。
- 旧 `DatePicker minDate={dayjs()}` 是这项约束的来源；换成原生输入后必须同时保留 `min` 与提交校验，不能只保留其一。

### 视频会议室 `/meeting/:roomId`
- `client/src/views/meeting-room/index.tsx` — 主视频组件
- `client/src/views/meeting-room/MeetingAccessGuard.tsx` — 密码校验守卫
- 子组件：`MainVideoStage`, `ParticipantSidebar`, `ParticipantTile`, `VideoControls`, `CommentPanel`

### 会议体验改进（本轮）

- 流程：身份/密码验证 → 入会准备 → 主动加入 → 会中协作 → 仅自己离开或确认结束所有人的会议。准备期间不连接会议 Socket、不向他人发送媒体；默认关闭设备，不自动请求摄像头/麦克风权限。
- 入会准备支持分别开启摄像头和麦克风、预览、音量检测、选择设备、失败重试、仅收听入会。设备切换保留开关状态；晚到的权限结果、离会、校验失效及页面卸载均释放媒体。
- 每位远端成员的音频独立播放，所有视频元素静音；画面选择与摄像头开关不决定谁能被听到。浏览器阻止自动播放时提供明确的开启声音入口。
- 屏幕共享与摄像头状态分离，停止共享恢复共享前的摄像头开关；无需摄像头也可以共享，不支持的浏览器显示说明。
- 主持人可仅自己离开，会议仍受原有到期规则约束；结束所有人必须二次确认。不新增主持人转交或延长会议接口。
- 显示信令连接/重新入会状态；入会、聊天发送、结束请求均有超时和断线失败反馈，不在重连后自动补发写操作。超时不代表服务端未执行，聊天重发前应检查记录。
- 创建成功后、会议列表及会议内提供邀请入口，使用当前站点 `/meeting/:id` 链接，提供复制失败时手动复制的文本，不在邀请中放入密码或入会凭证。创建失败保留表单。
- 本轮不部署 TURN、不改变数据库和现有鉴权协议；跨网络可用性仍需后续配置 TURN 并真实验证。会议笔记、录制、字幕和 AI 纪要不在本轮范围。
- 流程图：`docs/meeting/meeting-experience.excalidraw`。

### 聊天、状态与布局优化

- 聊天草稿和发送状态由当前会议页面统一持有，快捷输入与聊天面板同步，关闭面板不丢草稿；离会或切换房间清空，不写入浏览器持久存储。发送期间允许继续编辑，成功确认只清除未被修改的原草稿。
- 发送明确失败与结果未确认分别展示，超时或在途断线不自动重发；同一份未确认内容需要用户核对记录后显式确认重发。两个输入入口共用在途锁，避免同一事件循环重复发送。
- 打开聊天默认展示最新消息；查看历史时新消息不抢滚动位置，通过“新消息”入口回到末尾。历史快照补入旧消息不计为新到达消息。
- 默认状态只回答哪些成员正在连接、恢复或失败；失败连接旁直接提供单独重试。连接耗时、重试次数、直连/中继与配置警告收进可展开诊断，不用重复弹窗打断通话。
- 提供宫格/演示布局和显式固定/取消固定；关闭摄像头的成员也可固定显示头像。未固定时共享优先进入演示，结束后恢复原布局和选择；用户可主动切回宫格。隐藏自己只影响本地预览，不关闭设备、不影响别人接收。
- 成员媒体协议增加可选 `isScreenSharing` 布尔值，仅用于呈现，不授予新权限；缺失按 false 处理，旧数据可读，新客户端应与支持此字段的后端一起发布。共享仍复用单条视频轨道，不增加第二路视频或系统音频。

---

## 实时通信（Socket.IO + WebRTC）

### 连接可靠性优化

- 信令在线、已授权入会、每位成员的媒体连通分别建模；展示媒体连接耗时、重试次数与失败原因，不记录 SDP、候选地址和凭证。
- 入会登记完成即返回确认，历史评论独立同步并按消息 ID 合并。关键请求使用在线发送、原生 ack 超时及断线失败，不自动重放写操作。
- 开启 Trickle ICE。STUN/TURN 从服务端环境配置读取；TURN 使用共享密钥签发短期凭证，仅提供给已授权成员；未配置时明确提示跨网络能力受限。
- 服务端协调每对成员的连接代次及唯一发起方；自动恢复按连接代次比较后替换，过滤旧信令，设置建连超时、有限退避和手动重试。
- Socket.IO 短断恢复窗口为 15 秒且重新执行身份认证；成员在窗口内保留，客户端保留健康媒体。恢复失败或身份变化时重新授权入会并重建；主动退出、账号注销与会议结束不享受宽限。
- 部署保持单实例内存房间状态；本轮不引入分布式适配器或 SFU。真实跨网络及 TURN 中继验收需要部署可用服务。
- 恢复流程图：`docs/meeting/connection-recovery.excalidraw`。
- 入会请求带浏览器生命周期内稳定的 `clientSessionId`。主动全量重试更换该代次，服务端即使恢复原 Socket ID 也先清理双方旧 Peer；协商通知与信令按接收方客户端代次过滤，防止恢复缓存中的旧包影响新会话。

#### ICE 部署配置

自托管服务由 `turn/` 目录提供，不自行实现 TURN 协议。`pnpm turn:init --mode local --address <本机局域网IPv4>` 生成不会覆盖已有文件的专用配置及随机密钥；`pnpm turn:up` 单独启动。生产用 `--mode production` 和真实公网 IPv4 初始化，同一次后端部署自动带起已配置的 coturn。具体网络、TLS 和验收要求见 `turn/README.md`。

在服务端现有环境文件中配置（不在客户端存长期密钥）：

| 变量 | 内容 |
|------|------|
| `MEETING_STUN_URLS` | 可选，逗号分隔的实际 `stun:` / `stuns:` 地址 |
| `MEETING_TURN_URLS` | 可选，逗号分隔的实际 `turn:` / `turns:` 地址；按部署开放 UDP、TCP/TLS |
| `MEETING_TURN_SECRET` | 与 TURN 服务 REST 临时凭证机制一致的共享密钥，必须和 TURN 地址成对配置 |

没有默认公共 STUN/TURN。未配置时传递空 ICE 列表，并在界面提示跨网络能力受限。
TURN 用户名为 `到期秒数:用户ID`，密码为共享密钥计算的 HMAC-SHA1 Base64；凭证有效一小时，入会及后续媒体重建重新签发。长期密钥不进入 ack、信令、日志或邀请。
部署必须验证中继候选确实能连通，仅能解析域名或端口开放不足以验收；本轮没有部署 TURN 服务。

客户端连接读取顺序：`use-meeting-session` → `useP2PConnection` → `socket-events` / `use-socket-actions` → `PeerNetwork` → `PeerSession`。
服务端读取顺序：`membership-events` → `peer-negotiation` → `peer-negotiation-state`；短断清理由 `member-recovery` 管理。

### P2P 信令事件
| 事件 | 方向 | 说明 |
|------|------|------|
| `joinMeetingRoom` | Client → Server | 加入会议室 |
| `signal` | Client ↔ Server | WebRTC 信令数据转发 |
| `negotiateMeetingPeer` | Client → Server | 校验同房间后分配连接代次，`expectedConnectionId` 用于比较后替换；返回新临时 ICE 配置 |
| `meeting-peer-session` | Server → Client | 发布双方成员、唯一发起方、连接 ID、递增版本及本成员临时 ICE 配置 |
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
- `signal` 必须携带当前 `connectionId`，服务端拒绝旧代次和非法信令类型；新旧版本客户端需与服务端一起发布，旧客户端不能参与新协商协议。
- Socket ack 在调用前做运行时函数校验，离开成员时销毁对应 WebRTC Peer。

### 客户端 Hooks
| Hook | 路径 | 用途 |
|------|------|------|
| `useLocalMedia` | `views/meeting-room/hooks/` | 准备页和会议室共享本地媒体，按需申请和统一释放 |
| `useP2PConnection` | `client/src/hooks/useP2PConnection.ts` | 管理 WebRTC peer 连接与断线重入 |

---

## 可复用组件

| 组件 | 路径 | 用途 |
|------|------|------|
| Meetingmanage | `component/MeetingList/` | 会议管理列表 |
| RecentMeeting | `component/MeetingList/` | 最近会议卡片 |
| CreateMeetingModal | `component/MeetingList/` | 会议页与首页共用的创建会议弹窗 |
| MeetingSchedule | `component/MeetingList/` | 会议时间表 |
| addMeeting | `component/MeetingList/` | 创建会议入口，仅转发 `CreateMeetingModal` |

---

## 如何开发新功能

### 添加会议交互能力
1. 在 `server/app/socket/` 添加新的事件处理
2. 在客户端对应 hook 中添加事件监听
3. 更新 UI 组件响应新事件

### 扩展评论功能
1. 修改 `server/app/models/meetingComment.ts`（如需新字段）
2. 在 `server/app/routes/meeting/` 添加 Schema 和类型化路由声明，并在 `server/app/controller/meeting/` 实现用例
3. 更新 `client/src/views/meeting-room/components/CommentPanel.tsx`

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

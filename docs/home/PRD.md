# 首页模块 PRD

## 概述

登录后默认首页，展示最近笔记和近期会议。

**客户端**: `client/src/views/home/` — 路由 `/home`

## 页面组件

| 组件 | 文件 | 说明 |
|------|------|------|
| Home | `views/home/index.tsx` | 主页面 |
| RecentNoteList | `views/home/RecentNoteList.tsx` | 最近笔记列表 |
| RecentNoteCard | `views/home/RecentNoteCard.tsx` | 笔记卡片 |
| CardWrapper | `views/home/CardWrapper.tsx` | 卡片容器 |

## 数据来源

- 笔记：`GET /note/recent`
- 会议：`component/MeetingList/RecentMeeting`

## 使用组件

| 组件 | 来源 |
|------|------|
| Header | `component/Header.tsx` |
| RecentMeeting | `component/MeetingList/RecentMeeting` |

## 如何扩展

- 新增卡片：在 `views/home/` 添加组件，用 `CardWrapper` 保持风格一致
- 个性化：存偏好到 localStorage 或用户 meta

## 依赖

- note 模块（笔记数据）
- meeting 模块（会议数据）

## 移动端行为

- 最近笔记使用原生横向滚动和卡片吸附，桌面端保留按钮翻页。
- 近期会议按单列卡片展示，进入会议等主要操作在触摸设备上始终可见。
- 页面采用紧凑边距，并为固定底部导航和安全区预留空间。

## 桌面端视觉与操作（2026-09-28）

- 最近编辑为首页主内容，保留横向卡片与明确可点击的上一组、下一组按钮；卡片整体可用鼠标和键盘打开笔记。
- 无真实封面时使用文字优先的暖中性卡片，不重复展示文件图标、蓝色封面条和当前用户头像；更新时间仍可见。
- 近期会议为次级内容；无会议时使用紧凑的中性空状态，只保留一个「创建会议」入口。会议紫色仅用于小面积对象标识。
- 桌面侧栏顶部展示唯一的 NUBBI 品牌组合，账号入口固定在底部；账号菜单每个操作都提供清晰的悬停、焦点和点击反馈。

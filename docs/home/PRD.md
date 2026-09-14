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

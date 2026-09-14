# Sidebar Note 缓存与乐观更新

## 功能目的

Sidebar note 树在新建和删除 note 时使用乐观更新，避免列表先变化、再短暂闪回旧数据、最后又恢复正确状态。

## 用户可见行为

- 新建根 note 时，note 会立即出现在 sidebar 顶层。
- 新建子 note 时，父节点保持展开，子 note 会立即出现在子列表中。
- 删除 note 时，目标 note 会立即从 sidebar 中消失。
- 删除父 note 时，已缓存的子孙 note 也会从全量列表和最近列表缓存中移除。
- 如果列表已有数据，后台刷新期间不会整块切换为 loading skeleton。

## 关键技术设计

- `createNoteAtom` 和 `deleteSingleNoteAtom` 的 `onMutate` 会先取消相关 note 列表请求，再更新当前 root/children 列表、全量列表和最近列表缓存。
- 乐观新建会按 `_id` 去重并插入列表顶部，避免同一个 draft note 在请求成功后重复出现。
- 乐观删除会基于已缓存列表收集目标 note 的子孙节点，并从所有已缓存 note 列表中移除这些 id。
- mutation 成功后只用 `refetchType: "none"` 标记相关 query stale，不立即 refetch 当前 sidebar 列表，防止较慢的旧响应覆盖乐观结果。
- mutation 失败时会恢复 `onMutate` 前保存的缓存快照。

## 注意事项

- 手动刷新页面或后续重新进入页面时，仍会从服务端读取真实数据。
- 如果某个子孙 note 从未出现在任何本地缓存中，前端无法在乐观删除阶段感知它；服务端仍会递归删除，后续重新拉取数据会保持一致。
- `client/tsconfig.app.tsbuildinfo` 是构建产物，不应作为该功能变更提交。

/** 笔记无标题时的默认显示标题 */
export const DEFAULT_NOTE_TITLE = "Untitled";
/** 笔记查询的条数上限 */
export const NOTE_QUERY_LIMIT = 500;
/** 活跃笔记过滤条件：未删除 */
export const ACTIVE_NOTE_FILTER = { deletedAt: null } as const;
/** 列表查询排除的大字段（正文） */
export const NOTE_LIST_PROJECTION = "-content";

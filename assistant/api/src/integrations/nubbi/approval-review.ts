import type { ApprovalReview } from "@nubbi/assistant-shared/contracts";
import type { McpTool } from "../mcp/mcp.ts";

/**
 * 把未知值转成可展示字符串。
 * @param value 任意值。
 * @returns 字符串形式。
 */
const stringValue = (value: unknown): string =>
  typeof value === "string" ? value : value == null ? "" : JSON.stringify(value);

/**
 * 为审批卡片生成结构化评审内容，优先让 Nubbi 笔记类工具展示友好预览。
 * @param tool 目标 MCP 工具。
 * @param args 模型传入的工具参数。
 * @returns 评审内容；非 Nubbi 工具返回 undefined，前端回退为原始 JSON。
 */
export const buildApprovalReview = (tool: McpTool, args: Record<string, unknown>): ApprovalReview | undefined => {
  if (tool.originalName === "nubbi_create_note") {
    const details: Array<{ label: string; value: string }> = [];
    if (args.parent_id !== undefined && args.parent_id !== null) {
      details.push({ label: "父笔记", value: stringValue(args.parent_id) });
    }
    if (Array.isArray(args.tags)) {
      details.push({ label: "标签", value: args.tags.join(", ") });
    }
    return {
      operation: "创建笔记",
      title: stringValue(args.title) || "未命名笔记",
      content: stringValue(args.content),
      details,
    };
  }
  if (tool.originalName === "nubbi_edit_note_content") {
    const mode = stringValue(args.mode);
    const content = stringValue(args.content);
    const oldText = stringValue(args.old_text);
    const newText = stringValue(args.new_text);
    const body = content || (oldText ? `替换：${oldText} → ${newText}` : "");
    const details: Array<{ label: string; value: string }> = [
      { label: "笔记 ID", value: stringValue(args.note_id) },
      { label: "编辑模式", value: mode },
      { label: "内容版本", value: stringValue(args.base_content_revision) },
    ].filter((item) => item.value && item.value !== "undefined");
    return {
      operation: "编辑笔记内容",
      title: stringValue(args.title) || undefined,
      content: body,
      details,
    };
  }
  if (tool.originalName.startsWith("nubbi_")) {
    return {
      operation: tool.originalName.replace(/^nubbi_/, ""),
      details: Object.entries(args).map(([key, value]) => ({
        label: key,
        value: stringValue(value),
      })),
    };
  }
  return undefined;
};

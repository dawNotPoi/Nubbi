/** 每条消息计入开销的固定 token 数（角色、分隔符等），与服务端保持一致。 */
export const messageOverheadTokens = 8;

/** 模型上下文窗口的默认值（token），未配置时按此估算占用比例。 */
export const DEFAULT_CONTEXT_WINDOW = 128_000;

/**
 * 估算文本的 token 数：CJK 字符按 1 token，其余按 4 字符 1 token。
 * 用于上下文占用比例展示，与服务端压缩预算采用同一套估算逻辑。
 * @param text 待估算的文本。
 * @returns 估算的 token 数。
 */
export const countTokens = (text: string): number => {
  if (!text) return 0;
  const cjk = (text.match(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f\uac00-\ud7af]/g) ?? [])
    .length;
  return Math.ceil(cjk + (text.length - cjk) / 4);
};

/**
 * 估算一条消息的 token 数：各内容块文本之和加上固定开销。
 * @param parts 消息的内容块列表。
 * @returns 估算的 token 数。
 */
export const countPartsTokens = (
  parts: Array<{ type: string; text?: string; result?: string; message?: string }>,
): number => {
  const text = parts.map((part) => part.text ?? part.result ?? part.message ?? "").join("\n");
  return countTokens(text) + messageOverheadTokens;
};

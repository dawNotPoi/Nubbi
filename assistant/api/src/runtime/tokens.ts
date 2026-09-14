/**
 * 估算文本的 token 数：CJK 字符按 1 token，其余按 4 字符 1 token。
 * 用于上下文占用比例展示与自动压缩预算判断，不需要引入 tokenizer 依赖。
 * @param text 待估算的文本。
 * @returns 估算的 token 数。
 */
export const countTokens = (text: string): number => {
  if (!text) return 0;
  const cjk = (text.match(
    /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f\uac00-\ud7af]/g,
  ) ?? []).length;
  return Math.ceil(cjk + (text.length - cjk) / 4);
};

/** 每条上下文消息计入开销的固定 token 数（角色、分隔符等）。 */
export const messageOverheadTokens = 8;

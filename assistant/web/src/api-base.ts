/**
 * 计算 API 请求地址。
 * 开发环境由 Vite 代理 /api 到后端（见 vite.config.ts），因此直接返回原路径。
 * 若将来需要独立部署，可在此改写为绝对地址。
 * @param path 接口路径（以 / 开头）。
 * @returns 拼接后的完整请求地址。
 */
export const apiUrl = (path: string): string => path;



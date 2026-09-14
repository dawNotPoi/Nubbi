import type { IncomingHttpHeaders } from "node:http";

/** 将 Node.js HTTP 请求头对象转换为 Web 标准 Headers，用于 Better Auth API 调用 */
export const toWebHeaders = (headers: IncomingHttpHeaders): Headers => {
  const result = new Headers();

  Object.entries(headers).forEach(([name, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => result.append(name, item));
    } else if (value !== undefined) {
      result.set(name, value);
    }
  });

  return result;
};

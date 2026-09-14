import type { IncomingHttpHeaders } from "node:http";

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

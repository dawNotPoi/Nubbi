import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ApiRequestOptions, HttpMethod, NubbiApi } from "../types.js";
import { toolError, toolSuccess } from "../utils/response.js";

export const runTool = async (
  api: NubbiApi,
  operation: string,
  method: HttpMethod,
  path: string,
  options: ApiRequestOptions,
  summarize: (data: unknown) => string,
): Promise<CallToolResult> => {
  try {
    const data = await api.request(method, path, options);
    return toolSuccess(summarize(data), data);
  } catch (error) {
    return toolError(operation, error);
  }
};

export type HttpMethod = "GET" | "POST" | "PATCH";

export type QueryValue = string | number | boolean | null | undefined;
export type QueryParameters = Readonly<Record<string, QueryValue>>;

export interface ApiRequestOptions {
  query?: QueryParameters;
  body?: unknown;
  retryRead?: boolean;
}

export interface NubbiApi {
  request(
    method: HttpMethod,
    path: string,
    options?: ApiRequestOptions,
  ): Promise<unknown>;
  validateContext(): Promise<unknown>;
}

export interface HttpRuntimeConfig {
  apiUrl: string;
  host: string;
  port: number;
  allowedHosts: string[];
  allowedOrigins: string[];
}

export interface StdioRuntimeConfig {
  apiUrl: string;
  apiKey: string;
}

export interface ToolOutput {
  ok: boolean;
  summary: string;
  data: unknown;
  truncated: boolean;
  guidance: string | null;
}

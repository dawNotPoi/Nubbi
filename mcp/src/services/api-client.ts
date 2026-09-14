import {
  API_TIMEOUT_MS,
  READ_RETRY_DELAY_MS,
} from "../constants.js";
import type {
  ApiRequestOptions,
  HttpMethod,
  NubbiApi,
  QueryParameters,
} from "../types.js";

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getMessage = (payload: unknown): string | undefined => {
  if (!isRecord(payload)) return undefined;
  return typeof payload.message === "string" ? payload.message : undefined;
};

const wait = async (milliseconds: number): Promise<void> => {
  await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
};

export class NubbiApiError extends Error {
  public readonly status: number;
  public readonly data: unknown;

  public constructor(status: number, message: string, data: unknown = null) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

const addQuery = (url: URL, query: QueryParameters | undefined): void => {
  if (!query) return;
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }
};

const isRetryable = (error: unknown): boolean =>
  error instanceof NubbiApiError && [502, 503, 504].includes(error.status);

export class NubbiApiClient implements NubbiApi {
  readonly #baseUrl: string;
  readonly #apiKey: string;
  readonly #fetch: typeof fetch;

  public constructor(baseUrl: string, apiKey: string, fetchImpl: typeof fetch = fetch) {
    this.#baseUrl = baseUrl.replace(/\/$/, "");
    this.#apiKey = apiKey;
    this.#fetch = fetchImpl;
  }

  public async validateContext(): Promise<unknown> {
    return this.request("GET", "/mcp-api/context", { retryRead: true });
  }

  public async request(
    method: HttpMethod,
    path: string,
    options: ApiRequestOptions = {},
  ): Promise<unknown> {
    if (path !== "/mcp-api" && !path.startsWith("/mcp-api/")) {
      throw new Error("NubbiApiClient only permits /mcp-api routes");
    }
    const attempts = method === "GET" && options.retryRead ? 2 : 1;
    let lastError: unknown;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        return await this.requestOnce(method, path, options);
      } catch (error) {
        lastError = error;
        if (attempt + 1 >= attempts || !isRetryable(error)) throw error;
        await wait(READ_RETRY_DELAY_MS);
      }
    }
    throw lastError;
  }

  private async requestOnce(
    method: HttpMethod,
    path: string,
    options: ApiRequestOptions,
  ): Promise<unknown> {
    const url = new URL(`${this.#baseUrl}${path}`);
    addQuery(url, options.query);
    const headers = new Headers({ Accept: "application/json", "x-api-key": this.#apiKey });
    const init: RequestInit = { method, headers, signal: AbortSignal.timeout(API_TIMEOUT_MS) };
    if (options.body !== undefined) {
      headers.set("Content-Type", "application/json");
      init.body = JSON.stringify(options.body);
    }

    let response: Response;
    try {
      response = await this.#fetch(url, init);
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "TimeoutError";
      throw new NubbiApiError(
        timedOut ? 504 : 503,
        timedOut ? "Nubbi API request timed out" : "Could not reach the Nubbi API",
      );
    }

    const text = await response.text();
    let payload: unknown = null;
    if (text.length > 0) {
      try {
        payload = JSON.parse(text) as unknown;
      } catch {
        throw new NubbiApiError(502, "Nubbi API returned a non-JSON response");
      }
    }

    const data = isRecord(payload) && "data" in payload ? payload.data : payload;
    if (!response.ok) {
      throw new NubbiApiError(
        response.status,
        getMessage(payload) ?? `Nubbi API request failed with HTTP ${response.status}`,
        data,
      );
    }
    if (isRecord(payload) && payload.code === 0) {
      throw new NubbiApiError(400, getMessage(payload) ?? "Nubbi API rejected the request", data);
    }
    return isRecord(payload) && payload.code === 1 ? data : payload;
  }
}

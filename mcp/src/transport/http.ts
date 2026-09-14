import { createServer, type Server } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { hostHeaderValidation } from "@modelcontextprotocol/sdk/server/middleware/hostHeaderValidation.js";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { readHttpConfig } from "../config.js";
import { isDirectRun, reportFatalError } from "../utils.js";
import { createNubbiMcpServer } from "../server.js";
import { NubbiApiClient, NubbiApiError } from "../client/api-client.js";
import type { HttpRuntimeConfig } from "../types.js";

export const extractBearerToken = (header: string | undefined): string | null => {
  const match = /^Bearer\s+(nb_[A-Za-z0-9._~-]+)$/i.exec(header ?? "");
  return match?.[1] ?? null;
};

export const isAllowedOrigin = (origin: string, allowed: string[]): boolean =>
  allowed.includes(origin);

const rpcError = (response: Response, status: number, message: string): void => {
  response.status(status).json({
    jsonrpc: "2.0",
    error: { code: -32_001, message },
    id: null,
  });
};

const contextErrorStatus = (error: unknown): number => {
  if (!(error instanceof NubbiApiError)) return 502;
  return [401, 403, 429].includes(error.status) ? error.status : 502;
};

const contextErrorMessage = (status: number): string => {
  if (status === 401) return "Bearer token is invalid, expired, or revoked";
  if (status === 403) return "Bearer token is not a scoped Nubbi MCP Agent token";
  if (status === 429) return "Nubbi token rate limit exceeded; retry later";
  return "Nubbi API is unavailable; retry later";
};

const getBodyErrorStatus = (error: unknown): number => {
  if (typeof error !== "object" || error === null) return 500;
  const details = error as { status?: unknown; type?: unknown };
  if (details.status === 413 || details.type === "entity.too.large") return 413;
  if (details.status === 400 || details.type === "entity.parse.failed") return 400;
  return 500;
};

export const createHttpApp = (config: HttpRuntimeConfig): Express => {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "3mb", type: ["application/json", "application/*+json"] }));
  // MCP_ALLOWED_HOSTS 留空时不启用 Host 头校验（默认公开）；显式填写才按白名单拦截。
  if (config.allowedHosts.length > 0) {
    app.use(hostHeaderValidation(config.allowedHosts));
  }
  app.use((request: Request, response: Response, next: NextFunction): void => {
    const origin = request.get("origin");
    if (origin && !isAllowedOrigin(origin, config.allowedOrigins)) {
      rpcError(response, 403, "Origin is not allowed by MCP_ALLOWED_ORIGINS");
      return;
    }
    next();
  });

  app.get("/health", (_request: Request, response: Response): void => {
    response.set("Cache-Control", "no-store").json({ status: "ok", service: "nubbi-mcp-server" });
  });

  app.post("/mcp", async (request: Request, response: Response): Promise<void> => {
    const token = extractBearerToken(request.get("authorization"));
    if (!token) {
      rpcError(response, 401, "Authorization: Bearer nb_... is required");
      return;
    }

    const api = new NubbiApiClient(config.apiUrl, token);
    try {
      await api.validateContext();
    } catch (error) {
      const status = contextErrorStatus(error);
      rpcError(response, status, contextErrorMessage(status));
      return;
    }

    const server = createNubbiMcpServer(api);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(request, response, request.body as unknown);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`MCP request failed: ${message}\n`);
      if (!response.headersSent) rpcError(response, 500, "Internal MCP request error");
    } finally {
      await server.close().catch(() => undefined);
    }
  });

  app.all("/mcp", (_request: Request, response: Response): void => {
    response.set("Allow", "POST");
    rpcError(response, 405, "Method not allowed; use POST for stateless Streamable HTTP");
  });
  app.use(
    (
      error: unknown,
      _request: Request,
      response: Response,
      _next: NextFunction,
    ): void => {
      const status = getBodyErrorStatus(error);
      const message = status === 413
        ? "MCP request body exceeds the 3 MB limit"
        : status === 400
          ? "MCP request body contains malformed JSON"
          : "Internal MCP request error";
      rpcError(response, status, message);
    },
  );
  return app;
};

const listen = async (config: HttpRuntimeConfig): Promise<Server> => {
  const server = createServer(createHttpApp(config));
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(config.port, config.host, resolve);
  });
  return server;
};

export const runHttp = async (): Promise<void> => {
  const config = readHttpConfig();
  const server = await listen(config);
  process.stderr.write(`nubbi-mcp-server listening on ${config.host}:${config.port}\n`);
  const close = (): void => {
    server.close(() => process.exit(0));
  };
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
};

if (isDirectRun(import.meta.url)) {
  runHttp().catch((error: unknown) => reportFatalError("HTTP startup failed", error));
}

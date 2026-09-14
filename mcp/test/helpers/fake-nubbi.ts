import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

export interface FakeNubbi {
  baseUrl: string;
  keys: string[];
  close(): Promise<void>;
}

const send = (response: ServerResponse, data: unknown): void => {
  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ code: 1, message: "ok", data }));
};

const listen = async (server: Server): Promise<number> => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected TCP address");
  return address.port;
};

export const startFakeNubbi = async (): Promise<FakeNubbi> => {
  const keys: string[] = [];
  const server = createServer((request: IncomingMessage, response: ServerResponse): void => {
    const key = request.headers["x-api-key"];
    if (typeof key === "string") keys.push(key);
    const path = new URL(request.url ?? "/", "http://localhost").pathname;
    if (path === "/mcp-api/context") {
      send(response, { capabilities: ["note:read"], limits: { maxPageSize: 50 } });
      return;
    }
    if (path === "/mcp-api/notes") {
      send(response, {
        items: [{ _id: "65a000000000000000000001", title: "Atlas" }],
        total: 1,
        count: 1,
        offset: 0,
        hasMore: false,
        nextOffset: null,
      });
      return;
    }
    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ code: 0, message: "not found", data: null }));
  });
  const port = await listen(server);
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    keys,
    close: async (): Promise<void> => {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };
};

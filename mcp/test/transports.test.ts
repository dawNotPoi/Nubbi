import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { resolve } from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { TOOL_NAMES } from "../src/constants.js";
import { createHttpApp } from "../src/http.js";
import { startFakeNubbi } from "./helpers/fake-nubbi.js";

const listen = async (server: Server): Promise<number> => {
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected TCP address");
  return address.port;
};

const closeServer = async (server: Server): Promise<void> => {
  await new Promise<void>((resolveClose, reject) =>
    server.close((error) => (error ? reject(error) : resolveClose())),
  );
};

const verifyClient = async (client: Client): Promise<void> => {
  const tools = await client.listTools();
  assert.deepEqual(tools.tools.map((tool) => tool.name).sort(), [...TOOL_NAMES].sort());
  const result = await client.callTool({
    name: "nubbi_list_notes",
    arguments: { limit: 20, offset: 0, parent_id: "root" },
  });
  assert.equal(result.isError, undefined);
  assert.equal(result.structuredContent?.ok, true);
};

test("stateless JSON Streamable HTTP discovers and calls tools", async () => {
  const backend = await startFakeNubbi();
  const httpServer = createServer(
    createHttpApp({
      apiUrl: backend.baseUrl,
      host: "127.0.0.1",
      port: 3100,
      allowedHosts: ["127.0.0.1"],
      allowedOrigins: [],
    }),
  );
  const port = await listen(httpServer);
  const client = new Client({ name: "http-test", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(
    new URL(`http://127.0.0.1:${port}/mcp`),
    { requestInit: { headers: { Authorization: "Bearer nb_http_test" } } },
  );
  try {
    await client.connect(transport);
    await verifyClient(client);
    assert.ok(backend.keys.length >= 3);
    assert.ok(backend.keys.every((key) => key === "nb_http_test"));
  } finally {
    await client.close();
    await closeServer(httpServer);
    await backend.close();
  }
});

test("stdio discovers and calls the same tools without stdout logging", async () => {
  const backend = await startFakeNubbi();
  const client = new Client({ name: "stdio-test", version: "1.0.0" });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["--import", "tsx", "src/stdio.ts"],
    cwd: resolve(import.meta.dirname, ".."),
    env: {
      NUBBI_API_URL: backend.baseUrl,
      NUBBI_API_KEY: "nb_stdio_test",
    },
    stderr: "pipe",
  });
  try {
    await client.connect(transport);
    await verifyClient(client);
    assert.ok(backend.keys.every((key) => key === "nb_stdio_test"));
  } finally {
    await client.close();
    await backend.close();
  }
});

import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import test from "node:test";
import { createHttpApp } from "../src/http.js";
import type { HttpRuntimeConfig } from "../src/types.js";

const config: HttpRuntimeConfig = {
  apiUrl: "http://127.0.0.1:9",
  host: "127.0.0.1",
  port: 3100,
  allowedHosts: ["127.0.0.1"],
  allowedOrigins: ["https://allowed.example"],
};

const start = async (): Promise<{ server: Server; baseUrl: string }> => {
  const server = createServer(createHttpApp(config));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected TCP address");
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
};

const close = async (server: Server): Promise<void> => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
};

test("health is minimal and unauthenticated", async () => {
  const running = await start();
  try {
    const response = await fetch(`${running.baseUrl}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok", service: "nubbi-mcp-server" });
  } finally {
    await close(running.server);
  }
});

test("HTTP transport rejects disallowed origins and missing Bearer tokens", async () => {
  const running = await start();
  try {
    const originResponse = await fetch(`${running.baseUrl}/health`, {
      headers: { Origin: "https://evil.example" },
    });
    assert.equal(originResponse.status, 403);

    const authResponse = await fetch(`${running.baseUrl}/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "initialize", id: 1 }),
    });
    assert.equal(authResponse.status, 401);
    assert.match(JSON.stringify(await authResponse.json()), /Bearer nb_/);
  } finally {
    await close(running.server);
  }
});

test("malformed JSON returns a safe JSON-RPC error", async () => {
  const running = await start();
  try {
    const response = await fetch(`${running.baseUrl}/mcp`, {
      method: "POST",
      headers: {
        Authorization: "Bearer nb_malformed_test",
        "Content-Type": "application/json",
      },
      body: "{",
    });
    assert.equal(response.status, 400);
    assert.match(response.headers.get("content-type") ?? "", /application\/json/);
    const payload = await response.json();
    assert.equal(payload.jsonrpc, "2.0");
    assert.match(payload.error.message, /malformed JSON/);
    assert.doesNotMatch(JSON.stringify(payload), /node_modules|stack/i);
  } finally {
    await close(running.server);
  }
});

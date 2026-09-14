import assert from "node:assert/strict";
import test from "node:test";
import { normalizeApiUrl, readHttpConfig, readStdioConfig } from "../src/config.js";
import { extractBearerToken, isAllowedOrigin } from "../src/http.js";

test("normalizes supported Nubbi API URLs", () => {
  assert.equal(normalizeApiUrl("https://nubbi.example/api/"), "https://nubbi.example/api");
  assert.throws(() => normalizeApiUrl("file:///tmp/nubbi"), /http/);
});

test("stdio requires a Nubbi API key", () => {
  assert.throws(() => readStdioConfig({ NUBBI_API_URL: "http://localhost:4000" }), /required/);
  assert.throws(
    () => readStdioConfig({ NUBBI_API_KEY: "wrong", NUBBI_API_URL: "http://localhost" }),
    /beginning with nb_/,
  );
});

test("HTTP configuration rejects wildcard origins", () => {
  assert.throws(
    () => readHttpConfig({ MCP_ALLOWED_ORIGINS: "*" }),
    /exact origins/,
  );
  const config = readHttpConfig({
    MCP_PORT: "3110",
    MCP_ALLOWED_HOSTS: "mcp.example.com,localhost",
    MCP_ALLOWED_ORIGINS: "https://app.example.com",
  });
  assert.equal(config.port, 3110);
  assert.deepEqual(config.allowedHosts, ["mcp.example.com", "localhost"]);
});

test("Bearer and Origin helpers require exact safe values", () => {
  assert.equal(extractBearerToken("Bearer nb_abc-123.X"), "nb_abc-123.X");
  assert.equal(extractBearerToken("Basic nb_abc"), null);
  assert.equal(extractBearerToken("Bearer other"), null);
  assert.equal(isAllowedOrigin("https://app.example.com", ["https://app.example.com"]), true);
  assert.equal(isAllowedOrigin("https://evil.example", ["https://app.example.com"]), false);
});

import assert from "node:assert/strict";
import test from "node:test";
import { shouldRejectExternalApiKeyServerFields } from "../app/lib/apiKeyRequestGuard";

test("rejects external create and update requests that inject userId", () => {
  for (const path of ["/api-key/create", "/api-key/update"]) {
    assert.equal(
      shouldRejectExternalApiKeyServerFields({
        body: { userId: "victim", permissions: { note: ["purge"] } },
        external: true,
        path,
      }),
      true,
    );
  }
});

test("rejects external metadata changes that could downgrade an MCP key", () => {
  assert.equal(
    shouldRejectExternalApiKeyServerFields({
      body: { keyId: "mcp-key", metadata: { kind: "general" } },
      external: true,
      path: "/api-key/update",
    }),
    true,
  );
});

test("allows normal clients and trusted server-side calls", () => {
  assert.equal(
    shouldRejectExternalApiKeyServerFields({
      body: { name: "normal" },
      external: true,
      path: "/api-key/create",
    }),
    false,
  );
  assert.equal(
    shouldRejectExternalApiKeyServerFields({
      body: { userId: "owner" },
      external: false,
      path: "/api-key/create",
    }),
    false,
  );
});

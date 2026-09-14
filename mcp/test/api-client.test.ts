import assert from "node:assert/strict";
import test from "node:test";
import { NubbiApiClient, NubbiApiError } from "../src/services/api-client.js";

test("forwards x-api-key, maps query fields, and unwraps success data", async () => {
  let seenUrl = "";
  let seenKey: string | null = null;
  const mockFetch: typeof fetch = async (input, init) => {
    seenUrl = String(input);
    seenKey = new Headers(init?.headers).get("x-api-key");
    return new Response(
      JSON.stringify({ code: 1, message: "ok", data: { items: [], total: 0 } }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };
  const api = new NubbiApiClient("http://nubbi.test", "nb_secret", mockFetch);
  const result = await api.request("GET", "/mcp-api/notes", {
    query: { limit: 20, parentId: "65a000000000000000000001", ignored: undefined },
  });

  assert.equal(seenKey, "nb_secret");
  assert.match(seenUrl, /limit=20/);
  assert.match(seenUrl, /parentId=65a/);
  assert.doesNotMatch(seenUrl, /ignored/);
  assert.deepEqual(result, { items: [], total: 0 });
});

test("read retry happens once for a transient upstream failure", async () => {
  let calls = 0;
  const mockFetch: typeof fetch = async () => {
    calls += 1;
    if (calls === 1) {
      return new Response(JSON.stringify({ code: 0, message: "temporary", data: null }), {
        status: 503,
      });
    }
    return new Response(JSON.stringify({ code: 1, data: { ok: true } }), { status: 200 });
  };
  const api = new NubbiApiClient("http://nubbi.test", "nb_secret", mockFetch);
  assert.deepEqual(
    await api.request("GET", "/mcp-api/context", { retryRead: true }),
    { ok: true },
  );
  assert.equal(calls, 2);
});

test("write failures are not retried and retain conflict data", async () => {
  let calls = 0;
  const mockFetch: typeof fetch = async () => {
    calls += 1;
    return new Response(
      JSON.stringify({ code: 0, message: "revision conflict", data: { contentRevision: 7 } }),
      { status: 409 },
    );
  };
  const api = new NubbiApiClient("http://nubbi.test", "nb_secret", mockFetch);
  await assert.rejects(
    api.request("PATCH", "/mcp-api/notes/65a000000000000000000001/content", {
      body: { baseContentRevision: 6, mode: "append", content: "x" },
    }),
    (error: unknown) =>
      error instanceof NubbiApiError &&
      error.status === 409 &&
      JSON.stringify(error.data).includes("7"),
  );
  assert.equal(calls, 1);
});

test("client rejects routes outside the scoped MCP API", async () => {
  const api = new NubbiApiClient("http://nubbi.test", "nb_secret");
  await assert.rejects(api.request("GET", "/note/all"), /only permits/);
});

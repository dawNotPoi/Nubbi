import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { TOOL_NAMES } from "../src/constants.js";
import { createNubbiMcpServer } from "../src/server.js";
import type {
  ApiRequestOptions,
  HttpMethod,
  NubbiApi,
} from "../src/types.js";

interface RecordedCall {
  method: HttpMethod;
  path: string;
  options: ApiRequestOptions | undefined;
}

class RecordingApi implements NubbiApi {
  public readonly calls: RecordedCall[] = [];

  public async validateContext(): Promise<unknown> {
    return { capabilities: ["note:read"] };
  }

  public async request(
    method: HttpMethod,
    path: string,
    options?: ApiRequestOptions,
  ): Promise<unknown> {
    this.calls.push({ method, path, options });
    if (path.endsWith("/search")) {
      return { items: [{ _id: "65a000000000000000000001", title: "Atlas" }], total: 1, count: 1, offset: 0, hasMore: false, nextOffset: null };
    }
    return { _id: "65a000000000000000000001", title: "Draft", contentRevision: 1 };
  }
}

test("registers all tools and maps snake_case search input to camelCase API", async () => {
  const api = new RecordingApi();
  const server = createNubbiMcpServer(api);
  const client = new Client({ name: "nubbi-test-client", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);

  try {
    const listed = await client.listTools();
    assert.deepEqual(
      listed.tools.map((tool) => tool.name).sort(),
      [...TOOL_NAMES].sort(),
    );
    assert.ok(listed.tools.every((tool) => tool.outputSchema !== undefined));

    const result = await client.callTool({
      name: "nubbi_search_notes",
      arguments: {
        query: "launch",
        limit: 10,
        offset: 0,
        source: "agent",
      },
    });
    assert.equal(result.isError, undefined);
    assert.equal(result.structuredContent?.ok, true);
    assert.equal(api.calls[0]?.method, "GET");
    assert.equal(api.calls[0]?.path, "/mcp-api/notes/search");
    assert.deepEqual(api.calls[0]?.options?.query, {
      query: "launch",
      limit: 10,
      offset: 0,
      source: "agent",
      status: undefined,
      tag: undefined,
    });
  } finally {
    await client.close();
  }
});

test("strict schemas reject unknown or incomplete edit arguments before API calls", async () => {
  const api = new RecordingApi();
  const server = createNubbiMcpServer(api);
  const client = new Client({ name: "nubbi-test-client", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);

  try {
    const extra = await client.callTool({
      name: "nubbi_list_notes",
      arguments: { limit: 20, offset: 0, unexpected: true },
    });
    const incomplete = await client.callTool({
      name: "nubbi_edit_note_content",
      arguments: {
        note_id: "65a000000000000000000001",
        mode: "append",
        base_content_revision: 1,
      },
    });
    assert.equal(extra.isError, true);
    assert.equal(incomplete.isError, true);
    assert.equal(api.calls.length, 0);
  } finally {
    await client.close();
  }
});

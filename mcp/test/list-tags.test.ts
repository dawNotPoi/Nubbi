import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createNubbiMcpServer } from "../src/server.js";
import type {
  ApiRequestOptions,
  HttpMethod,
  NubbiApi,
} from "../src/types.js";

test("lists existing Nubbi tags through the read-only MCP tool", async () => {
  const calls: Array<{
    method: HttpMethod;
    path: string;
    options?: ApiRequestOptions;
  }> = [];
  const tags = ["MCP", "学习笔记"];
  const api: NubbiApi = {
    request: async (method, path, options) => {
      calls.push({ method, path, options });
      return tags;
    },
    validateContext: async () => ({}),
  };
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createNubbiMcpServer(api);
  const client = new Client({ name: "list-tags-test", version: "1.0.0" });

  await server.connect(serverTransport);
  await client.connect(clientTransport);

  try {
    const result = await client.callTool({
      name: "nubbi_list_tags",
      arguments: {},
    });

    assert.deepEqual(calls, [
      {
        method: "GET",
        path: "/mcp-api/tags",
        options: { retryRead: true },
      },
    ]);
    assert.equal(result.isError, undefined);
    assert.deepEqual(result.structuredContent, {
      ok: true,
      summary: "Found 2 existing tags.",
      data: tags,
      truncated: false,
      guidance: null,
    });
    const textContent = result.content.find((item) => item.type === "text");
    assert.equal(textContent?.type, "text");
    if (textContent?.type === "text") {
      assert.equal(textContent.text, "Found 2 existing tags.");
    }
  } finally {
    await client.close();
    await server.close();
  }
});

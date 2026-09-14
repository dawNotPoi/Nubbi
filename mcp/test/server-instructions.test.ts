import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createNubbiMcpServer } from "../src/server.js";
import type { NubbiApi } from "../src/types.js";

const unusedApi: NubbiApi = {
  request: async () => {
    throw new Error("The instructions test must not call the Nubbi API");
  },
  validateContext: async () => ({}),
};

test("advertises the write confirmation workflow to MCP clients", async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createNubbiMcpServer(unusedApi);
  const client = new Client({ name: "instructions-test", version: "1.0.0" });

  await server.connect(serverTransport);
  await client.connect(clientTransport);

  try {
    const instructions = client.getInstructions();
    assert.match(instructions ?? "", /read-only tools immediately/i);
    assert.match(instructions ?? "", /wait for explicit confirmation/i);
    assert.match(instructions ?? "", /not permission to invent content/i);
    assert.match(instructions ?? "", /call nubbi_list_tags/i);
    assert.match(instructions ?? "", /reuse exact existing tag names/i);
    const firstParagraph = instructions?.split(/\r?\n\r?\n/, 1)[0] ?? "";
    assert.ok(firstParagraph.length <= 512, "core instructions must fit in 512 characters");

    const { tools } = await client.listTools();
    const listTagsTool = tools.find((tool) => tool.name === "nubbi_list_tags");
    const createNoteTool = tools.find((tool) => tool.name === "nubbi_create_note");
    assert.equal(listTagsTool?.annotations?.readOnlyHint, true);
    assert.match(listTagsTool?.description ?? "", /reuse an existing tag exactly/i);
    assert.match(createNoteTool?.description ?? "", /call nubbi_list_tags/i);
    const writeTools = tools.filter((tool) => tool.annotations?.readOnlyHint === false);
    assert.equal(writeTools.length, 7);
    for (const tool of writeTools) {
      assert.match(tool.description ?? "", /wait for explicit confirmation/i, tool.name);
    }
  } finally {
    await client.close();
    await server.close();
  }
});

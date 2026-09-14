import assert from "node:assert/strict";
import test from "node:test";
import { CHARACTER_LIMIT, STRUCTURED_DATA_LIMIT } from "../src/constants.js";
import { NubbiApiError } from "../src/services/api-client.js";
import { toolError, toolSuccess } from "../src/services/response.js";

test("success returns concise text and structured content", () => {
  const result = toolSuccess("Found one note.", { items: [{ title: "Example" }] });
  assert.equal(result.isError, undefined);
  assert.equal(result.content[0]?.type, "text");
  assert.equal(result.structuredContent?.ok, true);
  assert.equal(result.structuredContent?.truncated, false);
});

test("oversized structured data is clipped with guidance", () => {
  const result = toolSuccess("Read note.", {
    content: "x".repeat(30_000),
    contentLength: 30_000,
    contentOffset: 0,
    hasMoreContent: false,
    id: "665c8d7e6f00112233445566",
    nextContentOffset: null,
    title: "Long note",
    totalContentLength: 30_000,
  });
  assert.equal(result.structuredContent?.truncated, true);
  assert.match(String(result.structuredContent?.guidance), /clipped/);
  const data = result.structuredContent?.data;
  assert.equal(typeof data, "object");
  assert.ok(data !== null && "content" in data);
  if (data !== null && typeof data === "object" && "content" in data) {
    assert.equal(typeof data.content, "string");
    assert.ok(String(data.content).length < 30_000);
    assert.equal(data.hasMoreContent, true);
    assert.equal(data.nextContentOffset, String(data.content).length);
    assert.ok(JSON.stringify(data).length <= STRUCTURED_DATA_LIMIT);
  }
  const text = result.content[0]?.type === "text" ? result.content[0].text : "";
  assert.match(text, /Continue/);
  assert.ok(text.length <= CHARACTER_LIMIT);
});

test("conflicts are actionable MCP tool errors", () => {
  const result = toolError(
    "Editing note",
    new NubbiApiError(409, "revision conflict", { contentRevision: 8 }),
  );
  assert.equal(result.isError, true);
  assert.equal(result.structuredContent?.ok, false);
  const text = result.content[0]?.type === "text" ? result.content[0].text : "";
  assert.match(text, /Re-read/);
  assert.match(JSON.stringify(result.structuredContent?.data), /8/);
});

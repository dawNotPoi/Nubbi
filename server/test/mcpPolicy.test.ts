import assert from "node:assert/strict";
import test from "node:test";
import {
  createMcpPermissions,
  hasMcpPermissionFingerprint,
} from "../app/lib/mcpPolicy";

test("recognizes the immutable MCP permission fingerprint", () => {
  assert.equal(hasMcpPermissionFingerprint(createMcpPermissions()), true);
  assert.equal(
    hasMcpPermissionFingerprint({ note: ["read", "update"] }),
    false,
  );
  assert.equal(
    hasMcpPermissionFingerprint({
      ...createMcpPermissions(),
      file: ["read"],
    }),
    false,
  );
  assert.equal(hasMcpPermissionFingerprint(null), false);
});

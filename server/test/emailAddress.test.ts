import assert from "node:assert/strict";
import test from "node:test";
import { validateEmailAddress } from "../app/lib/emailAddress";

test("accepts a well-formed email address", () => {
  assert.equal(validateEmailAddress("user@example.com"), null);
});

test("rejects malformed email addresses", () => {
  for (const email of ["user", "user@", "@example.com", "user@example"]) {
    assert.equal(validateEmailAddress(email), "请输入有效的邮箱地址");
  }
});

test("suggests corrections for common domain typos", () => {
  assert.equal(
    validateEmailAddress("user@gamil.com"),
    "邮箱域名是否应为 gmail.com？",
  );
});

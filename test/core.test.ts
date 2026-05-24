import test from "node:test";
import assert from "node:assert/strict";
import { MemoryRateLimiter, createReferenceId, isOriginAllowed, redactText, validateSupportRequest } from "../src/index.js";

test("validates and redacts support requests", () => {
  const result = validateSupportRequest({ project: "p", origin: "https://app.example.com", category: "bug", subject: " Help ", message: "token=secret", user: { email: "u@example.com" } }, { project: "p", allowedOrigins: ["https://app.example.com"] });
  assert.equal(result.ok, true);
  if (result.ok) { assert.match(result.value.refId, /^TH-[A-Z0-9_-]{8}$/); assert.equal(result.value.message, "token=[REDACTED]"); assert.equal(result.value.redacted, true); }
});

test("rejects invalid project, category, message and origin", () => {
  const result = validateSupportRequest({ project: "wrong", origin: "https://evil.example", category: "bug", subject: "", message: "" }, { project: "p", allowedOrigins: ["https://app.example.com"] });
  assert.equal(result.ok, false);
  if (!result.ok) assert.deepEqual(result.errors, ["project must match configured project policy", "origin is not allowed for this project", "subject is required", "message is required"]);
});

test("rejects honeypot spam and unsafe attachments", () => {
  const result = validateSupportRequest(
    {
      project: "p",
      origin: "https://app.example.com",
      category: "bug",
      subject: "Bad attachment",
      message: "See attached",
      honeypot: "bot-filled-field",
      attachments: [{ name: "dump.exe", type: "application/x-msdownload", size: 12_000_000 }]
    },
    { project: "p", allowedOrigins: ["https://app.example.com"], maxAttachmentBytes: 1_000_000 }
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.deepEqual(result.errors, [
      "honeypot must be empty",
      "attachment type is not allowed: application/x-msdownload",
      "attachment dump.exe exceeds 1000000 bytes"
    ]);
  }
});

test("origin helper supports exact and wildcard subdomains", () => {
  assert.equal(isOriginAllowed("https://a.example.com", ["*.example.com"]), true);
  assert.equal(isOriginAllowed("https://example.com", ["*.example.com"]), false);
  assert.equal(isOriginAllowed("https://app.example.com", ["https://app.example.com"]), true);
});

test("rate limiter resets after window", () => {
  const limiter = new MemoryRateLimiter();
  assert.deepEqual(limiter.check("k", { limit: 1, windowMs: 100, now: 0 }), { allowed: true, remaining: 0, resetAt: 100 });
  assert.equal(limiter.check("k", { limit: 1, windowMs: 100, now: 50 }).allowed, false);
  assert.equal(limiter.check("k", { limit: 1, windowMs: 100, now: 101 }).allowed, true);
});

test("reference ids and redaction are useful", () => {
  assert.match(createReferenceId(), /^TH-/);
  assert.equal(redactText("xoxb-1234567890-secret").value, "[REDACTED_SLACK_TOKEN]");
});

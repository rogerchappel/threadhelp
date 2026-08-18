import test from "node:test";
import assert from "node:assert/strict";
import { EmailAdapter, MemoryRateLimiter, SlackAdapter, createSupportRequestHandler } from "../src/index.js";

const body = {
  project: "p",
  category: "bug",
  subject: "Server smoke",
  message: "token=secret",
  user: { email: "customer@example.com" },
  context: { app: "example" }
};

test("server handler validates, redacts, dispatches and returns a reference", async () => {
  const handler = createSupportRequestHandler({
    policy: { project: "p", allowedOrigins: ["https://app.example.com"] },
    adapters: [
      new SlackAdapter({ channel: "#support", mode: "fixture" }),
      new EmailAdapter({ to: "support@example.com", from: "threadhelp@example.com", mode: "fixture" })
    ],
    limiter: new MemoryRateLimiter(),
    rateLimit: { limit: 2, windowMs: 60_000 },
    now: () => 1000
  });

  const response = await handler(
    new Request("https://support.example.com/api/threadhelp", {
      method: "POST",
      headers: { origin: "https://app.example.com", "content-type": "application/json" },
      body: JSON.stringify(body)
    })
  );

  const payload = (await response.json()) as { ok: boolean; refId: string; redacted: boolean; results: Array<{ ok: boolean }> };
  assert.equal(response.status, 200);
  assert.equal(payload.ok, true);
  assert.match(payload.refId, /^TH-/);
  assert.equal(payload.redacted, true);
  assert.equal(payload.results.length, 2);
});

test("server handler rejects disallowed origins before dispatch", async () => {
  const handler = createSupportRequestHandler({
    policy: { project: "p", allowedOrigins: ["https://app.example.com"] },
    adapters: [new SlackAdapter({ channel: "#support", mode: "fixture" })]
  });

  const response = await handler(
    new Request("https://support.example.com/api/threadhelp", {
      method: "POST",
      headers: { origin: "https://evil.example", "content-type": "application/json" },
      body: JSON.stringify(body)
    })
  );

  const payload = (await response.json()) as { ok: boolean; errors: string[] };
  assert.equal(response.status, 400);
  assert.equal(payload.ok, false);
  assert.deepEqual(payload.errors, ["origin is not allowed for this project"]);
});

test("server handler returns a deterministic 400 for non-array attachments", async () => {
  const handler = createSupportRequestHandler({
    policy: { project: "p", allowedOrigins: ["https://app.example.com"] },
    adapters: []
  });
  const response = await handler(new Request("https://support.example.com/api/threadhelp", {
    method: "POST",
    headers: { origin: "https://app.example.com", "content-type": "application/json" },
    body: JSON.stringify({ ...body, attachments: {} })
  }));

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { ok: false, errors: ["attachments must be an array when provided"] });
});

test("server handler returns a deterministic 400 for invalid nested values", async () => {
  const handler = createSupportRequestHandler({
    policy: { project: "p", allowedOrigins: ["https://app.example.com"] },
    adapters: []
  });
  const response = await handler(new Request("https://support.example.com/api/threadhelp", {
    method: "POST",
    headers: { origin: "https://app.example.com", "content-type": "application/json" },
    body: JSON.stringify({ ...body, user: { email: 42 }, context: [] })
  }));

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    ok: false,
    errors: ["user.email must be a string when provided", "context must be an object when provided"]
  });
});

test("validation failures do not consume rate-limit quota", async () => {
  const handler = createSupportRequestHandler({
    policy: { project: "p", allowedOrigins: ["https://app.example.com"] },
    adapters: [],
    limiter: new MemoryRateLimiter(),
    rateLimit: { limit: 2, windowMs: 60_000 },
    now: () => 1000
  });
  const send = (category: string) => handler(new Request("https://support.example.com/api/threadhelp", {
    method: "POST",
    headers: { origin: "https://app.example.com", "content-type": "application/json" },
    body: JSON.stringify({ ...body, category })
  }));

  assert.equal((await send("invalid")).status, 400);
  assert.equal((await send("invalid")).status, 400);
  assert.equal((await send("bug")).status, 200);
  assert.equal((await send("bug")).status, 200);

  const limited = await send("bug");
  assert.equal(limited.status, 429);
  assert.deepEqual(await limited.json(), {
    ok: false,
    rateLimit: { allowed: false, remaining: 0, resetAt: 61000 },
    errors: ["rate limit exceeded"]
  });
});

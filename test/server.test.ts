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

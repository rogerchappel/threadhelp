import test from "node:test";
import assert from "node:assert/strict";
import { buildWidgetRequest, createThreadHelpClient, installThreadHelp } from "../src/index.js";
import type { SupportRequestInput } from "../src/index.js";

test("widget builds support payload with user traits and safe context", () => {
  const payload = buildWidgetRequest(
    {
      project: "p",
      endpoint: "/api/threadhelp",
      origin: "https://app.example.com",
      user: { id: "user_123", email: "u@example.com" },
      traits: { plan: "pro" },
      context: { app: "example" }
    },
    { category: "question", subject: "Help", message: "How does this work?" }
  );

  assert.deepEqual(payload, {
    project: "p",
    origin: "https://app.example.com",
    category: "question",
    subject: "Help",
    message: "How does this work?",
    user: { id: "user_123", email: "u@example.com" },
    context: { app: "example", traits: { plan: "pro" } }
  });
});

test("widget client supports PRD command flow and submitted event", async () => {
  let sent: SupportRequestInput | undefined;
  const client = createThreadHelpClient(async (_endpoint, payload) => {
    sent = payload;
    return { ok: true, refId: "TH-12345678" };
  });
  let submitted = "";

  client.boot({ project: "p", endpoint: "/api/threadhelp", origin: "https://app.example.com" });
  client.identify({ email: "u@example.com" }, { orgId: "org_1" });
  client.prefill({ category: "bug", subject: "Export failed" });
  client.on("submitted", (payload) => {
    submitted = (payload as { refId: string }).refId;
  });

  const result = await client.submit({ category: "bug", subject: "Export failed", message: "CSV export failed" });

  assert.equal(result.refId, "TH-12345678");
  assert.equal(submitted, "TH-12345678");
  assert.equal(sent?.context?.traits?.orgId, "org_1");
});

test("installThreadHelp exposes the command API on a target object", () => {
  const target: Record<string, unknown> = {};
  installThreadHelp(target);

  const api = target.ThreadHelp as (command: string, ...args: unknown[]) => unknown;
  api("boot", { project: "p", endpoint: "/api/threadhelp" });
  api("open");

  assert.equal(typeof api, "function");
});

test("default widget transport returns submit errors for failed endpoints", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    ({
      ok: false,
      status: 503,
      statusText: "Service Unavailable"
    }) as Response;

  try {
    const client = createThreadHelpClient();
    let errorPayload: unknown;
    client.on("error", (payload) => {
      errorPayload = payload;
    });
    client.boot({ project: "p", endpoint: "/api/threadhelp", origin: "https://app.example.com" });

    const result = await client.submit({ category: "question", subject: "Help", message: "Endpoint down" });

    assert.equal(result.ok, false);
    assert.deepEqual(result.errors, ["ThreadHelp endpoint returned 503: Service Unavailable"]);
    assert.deepEqual(errorPayload, result);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

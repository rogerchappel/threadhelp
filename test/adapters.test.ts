import test from "node:test";
import assert from "node:assert/strict";
import { EmailAdapter, SlackAdapter, formatSlackMessage, formatSupportEmail, mapSlackThreadEvent, validateSupportRequest } from "../src/index.js";

const valid = validateSupportRequest({ project: "p", origin: "https://app.example.com", category: "question", subject: "Need help", message: "How does this work?", user: { email: "u@example.com", name: "User" } }, { project: "p", allowedOrigins: ["https://app.example.com"] });
if (!valid.ok) throw new Error("fixture invalid");
const request = valid.value;

test("Slack adapter formats dry-run payload and maps thread commands", async () => {
  const adapter = new SlackAdapter({ channel: "#support", mode: "fixture" });
  const result = await adapter.dispatch(request);
  assert.equal(result.ok, true);
  assert.equal(result.reference, `thread:${request.refId}`);
  assert.equal(formatSlackMessage(request, "#support").text, `[${request.refId}] Need help`);
  assert.deepEqual(mapSlackThreadEvent({ thread_ts: "1.2", user: "U1", text: "/note private", ts: "1.3" })?.sentToCustomer, false);
  assert.deepEqual(mapSlackThreadEvent({ thread_ts: "1.2", user: "U1", text: "Hello", ts: "1.3" })?.type, "operator_reply");
});

test("Email adapter formats dry-run payload", async () => {
  const adapter = new EmailAdapter({ to: "support@example.com", from: "noreply@example.com", mode: "fixture" });
  const result = await adapter.dispatch(request);
  assert.equal(result.ok, true);
  const email = formatSupportEmail(request, { to: "support@example.com", from: "noreply@example.com" });
  assert.equal(email.replyTo, "u@example.com");
  assert.match(email.subject ?? "", /Need help/);
});

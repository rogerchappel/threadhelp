#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { EmailAdapter, SlackAdapter, dispatchSupportRequest, validateSupportRequest, type SupportRequestInput } from "../index.js";
const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = process.argv[2] ?? resolve(here, "../../test/fixtures/support-request.json");
const input = JSON.parse(await readFile(fixturePath, "utf8")) as SupportRequestInput;
const validated = validateSupportRequest(input, { project: "threadhelp-demo", allowedOrigins: ["https://app.example.com", "http://localhost:3000"] });
if (!validated.ok) { console.error(JSON.stringify({ ok: false, errors: validated.errors }, null, 2)); process.exitCode = 1; } else { const results = await dispatchSupportRequest(validated.value, [ new SlackAdapter({ channel: "#support", mode: "fixture" }), new EmailAdapter({ to: "support@example.com", from: "threadhelp@example.com", mode: "fixture" }) ]); console.log(JSON.stringify({ ok: true, refId: validated.value.refId, redacted: validated.value.redacted, results }, null, 2)); }

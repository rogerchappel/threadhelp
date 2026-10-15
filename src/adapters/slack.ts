import { createHmac, timingSafeEqual } from "node:crypto";
import type { DispatchMode, DispatchResult, SlackThreadEvent, SupportRequest, SupportAdapter } from "../types.js";
export interface SlackAdapterOptions { channel: string; webhookUrl?: string; mode?: "dry-run" | "fixture" | "live"; }

const DEFAULT_MAX_AGE_SECONDS = 5 * 60;

/** Verify a Slack request using its exact raw request body and signing secret. */
export function verifySlackRequestSignature(options: {
  signingSecret: string;
  timestamp: string;
  signature: string;
  rawBody: string | Buffer;
  now?: number;
  maxAgeSeconds?: number;
}): boolean {
  const { signingSecret, timestamp, signature, rawBody } = options;
  if (!signingSecret || !/^\d+$/.test(timestamp) || !/^v0=[a-f0-9]{64}$/i.test(signature)) return false;
  const requestSeconds = Number(timestamp);
  const nowSeconds = Math.floor((options.now ?? Date.now()) / 1000);
  const maxAge = options.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS;
  if (!Number.isSafeInteger(requestSeconds) || !Number.isSafeInteger(nowSeconds) || !Number.isFinite(maxAge) || maxAge < 0) return false;
  if (Math.abs(nowSeconds - requestSeconds) > maxAge) return false;
  const base = `v0:${timestamp}:${typeof rawBody === "string" ? rawBody : rawBody.toString("utf8")}`;
  const expected = `v0=${createHmac("sha256", signingSecret).update(base, "utf8").digest("hex")}`;
  const expectedBytes = Buffer.from(expected, "utf8");
  const suppliedBytes = Buffer.from(signature, "utf8");
  return expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes);
}

export class SlackAdapter implements SupportAdapter { readonly name = "slack"; readonly mode: DispatchMode; private readonly options: SlackAdapterOptions; constructor(options: SlackAdapterOptions) { this.options = { mode: "dry-run", ...options }; this.mode = this.options.mode ?? "dry-run"; } async dispatch(request: SupportRequest): Promise<DispatchResult> { const payload = formatSlackMessage(request, this.options.channel); if (this.mode === "live") return { adapter: this.name, ok: false, mode: "live", destination: this.options.channel, reference: request.refId, payload, error: "Live Slack API calls are intentionally disabled in the initial OSS MVP; use dry-run/fixture mode." }; return { adapter: this.name, ok: true, mode: this.mode, destination: this.options.channel, reference: `thread:${request.refId}`, payload }; } }
export function formatSlackMessage(request: SupportRequest, channel: string): Record<string, unknown> { const user = request.user?.email ?? request.user?.name ?? request.user?.id ?? "anonymous user"; return { channel, text: `[${request.refId}] ${request.subject}`, blocks: [ { type: "header", text: { type: "plain_text", text: `${request.category.toUpperCase()}: ${request.subject}` } }, { type: "section", text: { type: "mrkdwn", text: request.message } }, { type: "context", elements: [ { type: "mrkdwn", text: `*Reference:* ${request.refId}` }, { type: "mrkdwn", text: `*User:* ${user}` }, { type: "mrkdwn", text: `*Priority:* ${request.priority}` }, { type: "mrkdwn", text: `*Origin:* ${request.origin}` } ] } ], metadata: { event_type: "threadhelp_support_request", event_payload: { refId: request.refId, project: request.project, category: request.category } } }; }
export function mapSlackThreadEvent(event: Record<string, unknown>): SlackThreadEvent | undefined { const text = typeof event.text === "string" ? event.text : undefined; const threadTs = typeof event.thread_ts === "string" ? event.thread_ts : undefined; const user = typeof event.user === "string" ? event.user : "unknown"; if (!threadTs) return undefined; if (text?.startsWith("/note ")) return { type: "internal_note", threadTs, user, text: text.slice(6), ts: String(event.ts ?? ""), sentToCustomer: false }; if (text === "/resolve") return { type: "resolved", threadTs, user, ts: String(event.ts ?? ""), sentToCustomer: false }; if (text?.startsWith("/assign ")) return { type: "assigned", threadTs, user, assignee: text.slice(8).trim(), ts: String(event.ts ?? ""), sentToCustomer: false }; const reply: SlackThreadEvent = { type: "operator_reply", threadTs, user, ts: String(event.ts ?? ""), sentToCustomer: true }; if (text !== undefined) reply.text = text; return reply; }

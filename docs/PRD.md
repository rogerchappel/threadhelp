# ThreadHelp PRD

Status: in-progress
Owner: Roger Chappel
Domain: threadhelp.com

## Summary

ThreadHelp is an open-source support widget and intake backend for small SaaS teams. It provides a unified, customizable support surface that can be embedded in every product Roger operates, starting with email and Slack notifications, then evolving into Slack-thread live chat, AI triage, and optional hosted support infrastructure.

## Problem

Small SaaS products need production-safe user support before they need a full helpdesk. Most support products are either expensive, closed, live-chat-first, or too heavy for early products. Roger needs one reusable support process across ClutchCut, CrewCMD, Thoroughbreds, Fixxi, and future SaaS products.

SilentAgents can help with automation, but not every support flow should start as an AI bot. Users need a reliable way to contact a human, and operators need enough context to act quickly.

## Goals

- Provide a drop-in support widget for SaaS apps.
- Capture useful context safely: app, URL, user/org, plan, browser, app version, optional screenshot.
- Send support requests to Slack and email in v1.
- Return a clear reference ID to the user.
- Support Slack-thread live chat as the unique wedge: Slack becomes the operator console.
- Keep the core open source and self-hostable.
- Design clean extension points for AI triage, live chat, Linear/GitHub, Chatwoot, Zendesk, Help Scout, and webhooks.

## Non-goals for MVP

- Full helpdesk UI.
- Complex agent inbox.
- Billing.
- Omnichannel support.
- AI chatbot as the mandatory first interaction.
- Capturing full console/network logs by default.

## Target users

- Indie SaaS founders.
- Small product teams using Slack.
- Developers who want inspectable support widgets.
- Teams that want support intake now and live chat/AI later.

## Core MVP flow

1. User clicks “Need help?” launcher.
2. Widget opens with product-specific greeting and theme.
3. User chooses category: bug, question, billing, feature request, other.
4. User enters subject/message.
5. Widget attaches safe context automatically.
6. User optionally adds screenshot/file.
7. Backend validates origin, rate limits, creates support request, and dispatches adapters.
8. Slack adapter posts a formatted message.
9. Email adapter sends a support email with reply-to user.
10. Widget shows confirmation: “We got it — reference TH-123.”

## Slack-thread live chat path

- Each conversation maps to one Slack thread.
- Customer messages from the widget append to the Slack thread.
- Operator replies in Slack thread are relayed back to the widget.
- Internal notes can be marked and not sent to the customer.
- Resolve/assign/AI buttons can be added later.

## AI path

AI should be a plugin after reliable intake:

- Summarize request for Slack.
- Classify category and priority.
- Redact obvious secrets.
- Suggest owner/channel.
- Suggest docs/reply.
- Later, answer from docs before escalation.

## Package shape

- `packages/core` — types, validation, request model, adapter interfaces.
- `packages/widget` — embeddable widget.
- `packages/react` — React helper/provider.
- `packages/next` — Next.js route handlers.
- `packages/adapters-slack` — Slack notification/live-chat bridge.
- `packages/adapters-email` — Resend/Postmark/SMTP adapter.
- `apps/demo` — demo/product site.
- `examples/nextjs` — integration example.

## Public API sketch

```js
ThreadHelp('boot', {
  project: 'clutchcut',
  user: { id: 'user_123', email: 'user@example.com', name: 'User' },
  traits: { plan: 'pro', orgId: 'org_456' }
})

ThreadHelp('open')
ThreadHelp('close')
ThreadHelp('toggle')
ThreadHelp('prefill', { category: 'bug', subject: 'Export failed' })
ThreadHelp('identify', user, traits)
ThreadHelp('shutdown')
ThreadHelp('on', 'submitted', callback)
```

## Security and privacy

- Public project keys only in browser.
- Strict allowed-origin checks.
- Rate limiting by project/IP/user.
- Honeypot and optional Turnstile/hCaptcha.
- Configurable PII capture.
- Attachment limits and MIME validation.
- No full console/network logs by default.
- Redact obvious secrets from metadata.
- Signed identity mode later.
- Delivery audit log.

## Success criteria for initial public build

- A developer can install/run locally.
- Demo widget can submit a support request.
- Slack and email adapters can be exercised in dry-run or fixture mode.
- Validation catches missing/invalid project, category, message, and origins.
- README explains Slack-thread live chat wedge honestly.
- Tests cover request validation, adapter formatting, and CLI/demo smoke.

## Differentiation

ThreadHelp is not another heavy helpdesk. It is a small open-source support layer where Slack threads can become the first live-chat inbox, email remains a fallback, and AI is a plugin rather than a wall between users and humans.

# ThreadHelp Tasks

## Shipped in the initial public MVP

- Core support request types and validation.
- Allowed-origin checks.
- Memory rate limiter.
- Reference ID generation.
- Obvious secret redaction.
- Adapter interface and dispatch helper.
- Slack fixture/dry-run formatter and thread event mapper.
- Email fixture/dry-run formatter.
- CLI demo flow using a fixture request.
- Tests for validation, redaction, rate limiting, adapters, and demo smoke.

## Next

- Browser widget package with launcher/open/close/prefill/identify APIs.
- Next.js route helper that combines validation, rate limiting, and dispatch.
- Shared storage-backed rate limiter examples.
- Explicit Slack app signature verification and live API adapter.
- Provider-specific email adapters for Resend/Postmark/SMTP.
- Delivery audit log shape.

## Later

- Slack reply relay to widget sessions.
- Assignment/resolution workflow.
- Optional AI triage plugin for summaries and suggested replies.
- Linear/GitHub/webhook adapters.
- Hosted docs/demo site.

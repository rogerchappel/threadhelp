# ThreadHelp

ThreadHelp is an open-source support widget and intake toolkit for small SaaS teams. The MVP focuses on a production-shaped support request pipeline: validate browser-origin submissions, redact obvious secrets, create a human-friendly reference ID, then dispatch to Slack and email in fixture/dry-run mode.

It is **not a full helpdesk yet**. There is no hosted inbox, ticket UI, billing system, or mandatory AI chatbot. The wedge is simple: Slack threads can become the first live-chat inbox for operators, with email as a reliable fallback. AI triage is intended to be a later plugin once intake is dependable.

## What works today

- Core support request schema and validation.
- Allowed-origin checks for exact origins and wildcard subdomains.
- In-memory rate-limit helper for local/API route use.
- Reference ID generation (`TH-XXXXXXXX`).
- Redaction for obvious API keys, Slack/GitHub/AWS tokens, passwords, secrets, and `token=` style values.
- Adapter interfaces for dispatch targets.
- Slack adapter formatting plus Slack-thread event mapping in fixture/dry-run mode.
- Email adapter formatting in fixture/dry-run mode.
- Demo CLI that submits a fixture support request and prints dispatch results.
- Tests covering validation, adapters, redaction, rate limiting, and the end-to-end demo flow.

## Install

```sh
npm install threadhelp
```

For local development:

```sh
npm install
npm test
npm run build
```

## Demo

```sh
npm run demo
```

The demo reads `test/fixtures/support-request.json`, validates it against a local policy, redacts obvious secrets, and dispatches to Slack/email fixture adapters. It does not call Slack or email providers.

## Minimal API example

```ts
import {
  EmailAdapter,
  MemoryRateLimiter,
  SlackAdapter,
  dispatchSupportRequest,
  validateSupportRequest
} from "threadhelp";

const limiter = new MemoryRateLimiter();
const rate = limiter.check("threadhelp-demo:ip:127.0.0.1", {
  limit: 5,
  windowMs: 60_000
});

if (!rate.allowed) throw new Error("Too many support requests");

const validated = validateSupportRequest(
  {
    project: "threadhelp-demo",
    origin: "https://app.example.com",
    category: "bug",
    subject: "Export failed",
    message: "CSV export returns 500",
    user: { email: "customer@example.com" },
    context: { app: "example-saas", url: "https://app.example.com/reports" }
  },
  {
    project: "threadhelp-demo",
    allowedOrigins: ["https://app.example.com"]
  }
);

if (validated.ok) {
  const results = await dispatchSupportRequest(validated.value, [
    new SlackAdapter({ channel: "#support", mode: "dry-run" }),
    new EmailAdapter({ to: "support@example.com", from: "threadhelp@example.com", mode: "dry-run" })
  ]);
  console.log(validated.value.refId, results);
}
```

## Slack-thread live chat path

The Slack adapter currently formats the initial support request and maps thread events such as:

- normal Slack thread replies → customer-visible operator replies
- `/note private text` → internal note
- `/assign @person` → assignment event
- `/resolve` → resolution event

The first public build intentionally avoids real Slack API calls, token handling, and webhook delivery. Those should be wired by host applications or future adapters with explicit secrets management and tests.

## Verify

```sh
npm test
npm run check
npm run build
bash scripts/validate.sh
npm run release:readiness
npm run release:check
```

If ReleaseBox is available locally, also run:

```sh
releasebox check .
releasebox notes . > RELEASE_NOTES.md
```

## Roadmap

See [ROADMAP.md](ROADMAP.md) and [docs/PRD.md](docs/PRD.md). Near-term work is a tiny browser widget, a Next.js route helper, and live provider adapters behind safe configuration.

## Security

See [SECURITY.md](SECURITY.md). Do not put Slack, email, or other provider tokens in browser code. The initial MVP is local-first and fixture-safe by design.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
Use [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md) before tagging or
publishing a release candidate.

## Limitations and Safety

- Open-source support intake for SaaS teams, starting with Slack-thread live chat and email fallback; it is intended for local, reviewable developer workflows rather than unattended production automation.
- Review generated output before using it in commits, releases, issue updates, or connector actions.
- Avoid passing secrets, private customer data, or unredacted logs through fixtures, examples, or command output.
- Treat warnings and non-zero exits from `threadhelp-demo` as review signals, then rerun the documented verification command after changes.

## License

MIT

## Development

Run the same checks locally before opening a PR:

- `npm run check` - npm run typecheck && npm test
- `npm run typecheck` - tsc --noEmit
- `npm run build` - tsc -p tsconfig.build.json
- `npm test` - node --test --import tsx test/*.test.ts
- `npm run smoke` - npm run demo && npm run package:smoke
- `npm run package:smoke` - build and verify required npm tarball files
- `npm run release:readiness` - verify metadata, exports, package allowlist, support docs, CI, and package-smoke wiring
- `npm run release:check` - npm run release:readiness && npm run check && npm run build && npm run package:smoke

The npm package includes compiled runtime files plus support documents needed
for release review: `README.md`, `SECURITY.md`, `CONTRIBUTING.md`,
`CODE_OF_CONDUCT.md`, `LICENSE`, `CHANGELOG.md`, and `RELEASE_NOTES.md`.

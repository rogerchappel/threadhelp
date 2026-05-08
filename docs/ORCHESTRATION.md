# Orchestration

ThreadHelp keeps orchestration explicit and local-first.

## Request pipeline

1. Accept support request input from a widget/API route.
2. Check a rate-limit key such as `project:userId` or `project:ip`.
3. Validate project, origin, category, subject, message, and optional email.
4. Redact obvious secrets across strings and nested metadata.
5. Generate a reference ID.
6. Dispatch to configured adapters.
7. Return the reference ID and adapter results to the caller.

## Adapter policy

Adapters implement `SupportAdapter` and return structured `DispatchResult` objects. The initial Slack and email adapters are dry-run/fixture safe and deliberately refuse live API calls. Provider-specific live adapters should be separate, reviewed, and backed by integration tests.

## Slack thread mapping

Slack threads are the planned operator console:

- initial request creates/maps to one Slack thread
- customer messages append to the thread later
- normal operator replies are customer-visible
- `/note` remains internal
- `/assign` and `/resolve` update conversation state later

## Release classification

Current classification: **ship/incubate** — useful as a public OSS MVP and package foundation, not production-complete helpdesk infrastructure.

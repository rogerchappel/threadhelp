# Security Policy

ThreadHelp is pre-1.0. No versioned release is supported for production use yet.

| Version | Supported |
| --- | --- |
| 0.x | Best-effort security review while the project incubates |

## Reporting a Vulnerability

Please do not report suspected vulnerabilities in public issues, pull requests, or discussions.

Ask the maintainer for a private reporting path before sharing details. If no private path is available yet, open a public issue asking for one without including exploit details, secrets, personal data, or sensitive technical details.

## Current Security Posture

- Slack and email adapters are fixture/dry-run by default.
- Live Slack/email provider calls are intentionally disabled in this initial OSS MVP.
- Browser-origin validation is included, but host applications must configure allowed origins correctly.
- Redaction catches obvious secrets but is not a substitute for careful data minimization.
- The in-memory rate limiter is useful for local/API route demos; production deployments should use shared storage.
- Do not expose provider tokens, private API keys, or credentials to browser code.

## What to Include Privately

- Clear description and potential impact.
- Affected files, versions, and workflows.
- Safe reproduction steps or proof of concept.
- Suggested mitigation if known.

## Scope

In scope:

- ThreadHelp core validation, redaction, dispatch, adapter behavior, and CI/release guidance.
- Insecure defaults shipped by this repository.

Out of scope:

- Downstream app misconfiguration outside ThreadHelp guidance.
- Requests for guaranteed response timelines, paid support, or production SLAs.

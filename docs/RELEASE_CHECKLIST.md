# Release Checklist

Use this checklist before tagging or publishing a release candidate.

## Local Gate

```sh
npm ci
npm run release:check
```

`release:check` starts with release-readiness metadata checks, then runs
typecheck, tests, build, and package tarball verification.

## Package Evidence

```sh
npm run package:smoke
```

The package smoke verifies:

- the built `threadhelp-demo` binary target exists
- public runtime exports are compiled into `dist`
- Slack and email adapter entrypoints are packaged
- widget and server helper entrypoints are packaged
- release support documents are included in the npm tarball

## Safety Review

- Keep Slack and email adapters in fixture or dry-run mode unless a host
  application supplies explicit provider configuration.
- Do not put provider tokens in browser code, fixture files, docs, screenshots,
  or issue text.
- Confirm release notes distinguish local fixture behavior from future live
  provider delivery.

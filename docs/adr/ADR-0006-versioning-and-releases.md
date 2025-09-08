# ADR-0006: Versioning and Release Policy (v1)

Date: 2025-09-08

## Status

Accepted

## Context

This project is a simple SPA (Vue + Vite) deployed to GitHub Pages with no backend in v1. We want a predictable but minimal versioning and release process that does not add tooling or complexity.

## Decision

- App version: Use Semantic Versioning `MAJOR.MINOR.PATCH` for the web app.
- Source of truth: `package.json#version`. Bump via `npm version patch|minor|major`.
- Git tags: Tag releases as `vX.Y.Z` (created by `npm version` or manually). Tags provide traceability; GitHub Releases are optional.
- Deployments: Keep Pages deployments on every push to `main` (current workflow). Tags are for traceability, not gating deploys in v1.
- Pre‑releases: If needed, use `-rc.N` (e.g., `1.2.0-rc.1`). Pages continues to deploy `main`; no separate channels.
- Branching: Trunk‑based on `main`. Use short‑lived feature branches via PRs into `main`. A long‑lived `develop` branch is not required; if present, synchronize it by merging `main` back after a release to avoid version drift.
- Stamping (optional, simple): Expose build info in the UI using Vite envs:
  - `VITE_APP_VERSION = npm_package_version`
  - `VITE_APP_COMMIT = $GITHUB_SHA` (first 7 chars shown)
  These can be displayed in a small footer/About dialog. Implementation can land as a separate small task.
- Changelog: Keep it lightweight. Summarize notable changes in PR descriptions and Git tags; a generated `CHANGELOG.md` is not required in v1.
- Data/catalog changes: Adding or correcting entries is a PATCH. Schema changes (e.g., new required fields) are MINOR; breaking JSON shape changes (removing/renaming fields) are MAJOR.
- Docs versioning: Continue using `docs/prd/<slug>/vN`, `ARCH-vN.md`, and ADRs. On meaningful scope/boundary changes, bump to the next `vN` for docs.

## Consequences

- Minimal overhead: No new tooling (e.g., semantic‑release) or complex branching.
- Clear traceability: `package.json` and tags align; Pages always serves the latest `main` build.
- Easy support: Version and short commit shown in the UI (once stamping is wired) aid bug reports.

## Implementation Notes

- Bump and tag:

  ```sh
  # patch/minor/major as appropriate
  npm version patch
  git push --follow-tags
  ```

- Manual flow via GitHub UI (no local CLI required):

  1) Bump version in `package.json` via PR to `main`:
     - Navigate to `package.json` → Edit (pencil) → update the `version`.
     - Propose changes to a new branch and open a PR targeting `main`.
     - Let CI pass (typecheck/tests) and merge the PR into `main`.
  2) Create an annotated tag and (optional) Release:
     - Go to GitHub → Releases → “Draft a new release”.
     - Choose a tag → “Create new tag” `vX.Y.Z`; target the merge commit on `main`.
     - Publish. (This creates the tag; Release notes are optional in v1.)
  3) Deployment:
     - Pages deployment runs automatically on push to `main` and will already have built the merged commit.
  4) If using a `develop` branch (optional):
     - Open a PR from `main` → `develop` and merge to keep branches in sync.

- Optional stamping in CI (deploy workflow):

  ```yaml
  env:
    VITE_APP_VERSION: ${{ vars.APP_VERSION || steps.pkg.outputs.version }}
    VITE_APP_COMMIT: ${{ github.sha }}
  ```

  Or rely on Vite reading `process.env.npm_package_version` directly for `VITE_APP_VERSION`.

## Alternatives Considered

- CalVer (`YYYY.MM.PATCH`): nice for steady cadence, but SemVer is familiar and sufficient here.
- Release‑only deployments: gating Pages deploys by tags adds friction; deferred unless needed.
- Full automation (semantic‑release): powerful but heavier than needed for v1.

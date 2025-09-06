# ADR-0004: Dependency Policy (v1)

Date: 2025-09-06

## Status

Accepted

## Context

To keep the calculator lean, predictable, and secure, we want tight control over runtime dependencies. Prior ADRs established the initial stack: Vue 3 + Vite + TypeScript + Pinia (ADR-0001) and Tailwind CSS (ADR-0003). No charting library in v1.

## Decision

- New runtime dependencies require a short ADR and approval under `docs/adr/` before introduction.
- Dev-only tooling (linters, formatters, test runners) can be added without a runtime ADR, but still require a brief note in PR description (license, purpose) and should be removable/replaceable.
- Licenses: Prefer MIT/Apache-2.0/BSD; avoid copyleft for runtime deps.
- Security: Avoid unmaintained packages; pin versions; use minimal footprint.

## Consequences

- Changes that propose runtime libs (e.g., charting, state libraries beyond Pinia, data-fetching) must include an ADR discussing alternatives and rationale.
- Tailwind CSS is already covered by ADR-0003; no additional ADR needed for its configuration in v1.

## Alternatives Considered

- Allow ad-hoc additions: rejected; increases risk and drift.
- Blanket ban on new deps: rejected; too restrictive for future needs.

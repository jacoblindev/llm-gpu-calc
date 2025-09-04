# Agents Guide (Codex/Copilot)

Purpose: One entrypoint for AI agents (and humans) to follow the PRD → SD/SA → Tasks → Process workflow with lean guardrails and a versioned docs layout.

## Start Here

- Read: `rules/create-prd.md`, `rules/generate-tasks.md`, `rules/process-task-list.md`.
- Store artifacts in versioned folders under `docs/`:
  - PRD: `docs/prd/<feature-slug>/vN/prd.md`
  - SD/SA (project-wide): `docs/architecture/ARCH-vN.md`
  - ADRs: `docs/adr/ADR-00xx-<short-title>.md`
  - Tasks: `docs/tasks/<feature-slug>/vN/tasks.md`

## Gates (must pass for each sub-task)

- Tests: Public behavior covered; obsolete tests updated/removed in the same PR; local runtime reasonable.
- Boundaries: Imports respect latest `docs/architecture/ARCH-v*.md` and public APIs; deviations documented (ADR/update ARCH).
- Dependencies: New runtime deps require a short ADR and approval under `docs/adr/`.

Optional extras: size/complexity heuristics, architecture lint (ArchUnit/eslint-boundaries), simple dep/license checks.

## Task Rhythm

1) PRD: Write or revise PRD with Module Plan, Test Strategy, Dep Policy in `docs/prd/<slug>/vN/prd.md`.
2) SD/SA: From the PRD, write `docs/architecture/ARCH-vN.md` (1–2 pages) + first ADR under `docs/adr/` with key choices.
3) Parents: Include “0.0 Scaffolding” and “X.0 Align & prune tests” in `docs/tasks/<slug>/vN/tasks.md`. Pause/confirm before sub-tasks.
4) Sub-tasks: 1–4h each; implement minimal code; run tests; conventional commits.
5) PR: Ensure gates pass locally.

## Agent Checklist (Concise)

- Clarify: Ask 5–8 focused questions to remove ambiguity; confirm feature slug and version (vN).
- Draft PRD: Create `docs/prd/<slug>/vN/prd.md` per `rules/create-prd.md` with acceptance criteria and a Module Plan.
- Draft SD/SA + ADR: Write `docs/architecture/ARCH-vN.md` (1–2 pages) and `docs/adr/ADR-0001-<title>.md` covering key decisions.
- Propose Parents: Create `docs/tasks/<slug>/vN/tasks.md` with 0.0 Scaffolding and X.0 Align & prune tests; pause for user approval.
- Expand Sub‑tasks: Break parents into 1–4h sub‑tasks with acceptance criteria (tests, boundaries, ADR if new dep).
- Implement Loop: For the approved sub‑task, implement minimal code, write/update tests, validate gates (tests/behavior, boundaries vs latest ARCH, ADR for runtime deps), update tasks, and pause before the next sub‑task.
- Handle Deps: When proposing a new runtime dependency, open a short ADR under `docs/adr/` and request approval.
- Versioning: On meaningful scope/boundary changes, bump to `vN+1` for PRD/Tasks, add `ARCH-vN+1.md`, and link superseding ADRs.

Approval checkpoints: after PRD, after ARCH/first ADR, after parent list, and before starting each sub‑task; also when introducing a new runtime dependency.

## First Prompts (examples)

- “Follow AGENTS.md. Start with `rules/create-prd.md`. Save PRD to `docs/prd/<slug>/v1/prd.md`. Produce `docs/architecture/ARCH-v1.md` + an ADR in `docs/adr/`. Propose parent tasks in `docs/tasks/<slug>/v1/tasks.md`; pause for confirmation.”
- “Generate tasks per `rules/generate-tasks.md` using latest `docs/architecture/ARCH-v*.md` as boundaries. Include X.0 Align & prune tests.”

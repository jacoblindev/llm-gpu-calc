# Generate Tasks (lean v2)

Goal: Turn the PRD + SD/SA into a minimal, ordered task list that establishes architecture scaffolding first, then iterates safely with a few high‑ROI gates.

The original rhythm is preserved: assess → plan → parent tasks → confirm → sub-tasks.

---

## 0. Prerequisite: SD/SA Exists

- Ensure `docs/architecture/ARCH-vN.md` and at least one ADR under `docs/adr/` exist per `/rules/create-prd.md`.
- Treat the latest `docs/architecture/ARCH-v*.md` as the source of truth for module boundaries and allowed deps.

## 1. Assess Current State

- Capture a quick repo snapshot (tree, stack, test command, notable risks) in the top of your tasks file or a short `ASSESSMENT.md`.
- Summarize any major risks or refactors in the parent tasks.

## 2. Confirm PRD & Guardrails

- Ensure the PRD includes: Module Decomposition Plan, Test Strategy, Dependency Policy, and Reference Architecture.
- Confirm the latest `docs/architecture/ARCH-v*.md` boundaries are current; update PRD or ARCH if mismatched before proceeding.

## 3. Baseline Settings (Optional)

- Agree any thresholds you care about (file size, function size, complexity, test budget).
- Decide on allowlist/blocklist approach and how to enforce it (tooling optional).

## 3b. Architecture & Scaffolding First

- Create the directory layout + empty stubs per PRD’s Module Plan and the latest ARCH boundaries.
- Expose only public APIs; keep stubs thin. No heavy logic yet.
- Capture any intentional deviations from ARCH with an ADR.

## 3c. Optional Guardrails

- Add simple checks if desired (file-size/complexity, linting, dependency/license).

---

## Phase 1: Generate Parent Tasks

Always include the scaffolding task first:

- [ ] 0.0 Establish architecture scaffolding
  - [ ] 0.1 Create directory layout & stubs from PRD Module Plan
  - [ ] 0.2 Align code with ARCH boundaries; add/update ADR if deviating
  - [ ] 0.3 Agree simple dependency rule (ADR required for new runtime deps)

Then include feature slices or layers as parents (one line each). Keep them small and cohesive.

Add a test alignment parent task:

- [ ] X.0 Align & prune tests
  - [ ] X.1 Retire tests mismatching updated requirements (same PR)
  - [ ] X.2 Add/adjust tests for new public behavior only
  - [ ] X.3 Keep test runtime within agreed budget

Pause/confirm: Share the parent list for confirmation before generating sub-tasks.

---

## Phase 2: Generate Sub-Tasks

- After confirmation, expand each parent into sub-tasks (1–4 hours each).
- Include acceptance criteria and explicit gates per `/rules/process-task-list.md`.
- Prefer vertical slices that demonstrate real behavior end-to-end.

Example sub-task shape:

- [ ] Implement Domain Policy A
  - Acceptance: Public behavior covered by tests; boundaries respected per latest ARCH; ADR updated if a new runtime dep is introduced.
  - Notes: Any ADR or trade-offs captured.

---

## Output of this step

- A task list under `docs/tasks/<feature-slug>/vN/tasks.md` with parents (including 0.0 Scaffolding and X.0 Align & Prune Tests) and scoped sub-tasks ready for `/rules/process-task-list.md`.
- Traceability notes linking parents/sub-tasks to sections in the PRD (`docs/prd/<feature-slug>/vN/prd.md`) and ARCH (`docs/architecture/ARCH-vN.md`).

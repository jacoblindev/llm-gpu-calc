# Create PRD (lean v2)

Purpose: Produce a PRD clear enough for a junior developer to implement, while also steering structure and sustainability. Keep it concise, testable, and specific.

Reader assumptions: Write for a junior developer; be explicit, avoid jargon; prefer examples over prose.

This is the v2 of the original guidance; the flow and intent are preserved: clarify → specify the product → constrain the solution. New in v2 are required sections to encode architecture and guardrails.

---

## Clarifying Questions (baseline)

Ask only what’s necessary to remove ambiguity. Examples:

- Users: Who are the primary users? Any key personas or access roles?
- Scope: What must be included vs explicitly out-of-scope in this iteration?
- Success: What observable outcomes define success? What metrics/telemetry matter?
- Constraints: Performance, privacy, compliance, budget, time, or platform limits?
- Dependencies: Must integrate with existing systems, libraries, or services?

Document answers briefly in the PRD.

## PRD Sections (baseline)

- Context: Why we’re doing this; short background.
- Goals: The outcomes we want, in business or user terms.
- Non-Goals: What we specifically won’t do now.
- User Stories / Scenarios: “As a {{role}}, I want {{capability}} so {{benefit}}.”
- Acceptance Criteria: Concrete, testable conditions; include edge cases.
- UX Notes: Key interactions, states, and accessibility expectations.
- Risks & Assumptions: Unknowns, external dependencies, fallbacks.
- Telemetry & KPIs: Events, metrics, and success measurements.

Keep these sections brief but unambiguous. Favor examples over prose.

---

## Reference Architecture (lean)

Pick one and state why. Define module boundaries and allowed dependencies in a few bullets.

- Options: Hexagonal (Ports/Adapters), Clean Architecture, or Feature-Sliced.
- Dependencies: Declare allowed vs forbidden cross-module imports.
- Data flow: One high-level call-flow, e.g.:
  - UI → Application Service → Domain → Port (Outbound) → Adapter (Infra)
  - Public API → Feature module → Shared utils (read-only)

Include 3–5 bullets that describe the intended call paths and where state lives.

## Module Decomposition Plan (Required)

Target directory layout and modules. For each module, specify:

- Responsibility: What this module owns.
- Public API: Types/functions/classes exposed to other modules.
- Internal Notes: Hidden implementation details, state, and patterns used.
- Estimated File Counts: Expected file sizes and how they’ll split.

Example target layout:

```sh
src/
  app/            # orchestration/services
  domain/         # pure logic, entities, policies
  infra/          # adapters (db/http/files)
  ui/             # web/mobile/cli layers
```

## Suggested Size & Complexity Limits (Optional)

- max_file_lines: 500 (suggested)
- max_func_lines: 70 (suggested)
- max_cyclomatic: 10 (suggested)

Use these as heuristics, not hard gates. For small changes, you may skip.

## Shared Conventions (Required)

- Folder strategy: Choose one — feature-first or layer-first. Stick to it.
- Cross-module access: Only through public interfaces defined in the Module Plan.
- Naming: Consistent, descriptive names; avoid abbreviations. Keep modules small.

## Test Strategy (Required)

- Prefer unit and contract/API tests; minimize brittle snapshots.
- If requirements change, obsolete tests are updated or removed in the same PR.
- Focus on public behavior; avoid testing internals directly.
- Keep local test runtime reasonable (e.g., under a few minutes) — agree with the team.

## Dependency Policy (Required)

- Any new runtime dependency must be justified with a short ADR (alternatives, license, security posture).
- Prefer small dependency footprints; avoid adding deps for trivial utilities.

---

## Produce SD/SA From The PRD (lean)

Right after finalizing the PRD, produce a lightweight System Design / Solution Architecture (SD/SA). Keep it to 1–2 pages and favor clear boundaries over prose.

Inputs: The PRD. Outputs: `docs/architecture/ARCH-vN.md` (1–2 pages) + first `docs/adr/ADR-00xx-<short-title>.md`.

Include:

- Architecture overview and primary drivers (performance, privacy, scale).
- Module map: boundaries, allowed dependencies, and import rules (tie back to Module Plan).
- Key contracts: Public APIs/interfaces between modules or external systems.
- Data flow: One call-flow and state ownership decisions.
- Non-functionals: Key budgets (latency/SLA/resource) and testability notes.
- Tech choices: Libraries/services with a one-line rationale (details in ADR).
- Risks: Top 3 risks and mitigations.

---

## Output of this step

- A PRD document including the sections above, plus a concise glossary if needed, saved to `docs/prd/<feature-slug>/vN/prd.md`.
- A short SD/SA: `docs/architecture/ARCH-vN.md` + an ADR under `docs/adr/`, derived from the PRD.

Next: Use the SD/SA to drive the task list in `/rules/generate-tasks.md` and create `docs/tasks/<feature-slug>/vN/tasks.md`.

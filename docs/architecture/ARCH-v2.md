# Architecture Overview (v2)

Primary drivers (v2): Apple‑style clean minimalism and clarity, with per‑GPU vRAM visualization as the hero once GPUs are selected; instant feedback; strong accessibility; no changes to domain math.

## What Changed From v1

- Flow: Adopt Option A — Guided stepper with a sticky results preview panel that appears after GPU selection and remains visible thereafter. A Canvas (split) mode may be added later as a toggle.
- UI Composition: Introduce a compact results preview panel that renders the same per‑GPU segmented bars as the Results step, driven by App‑level derived data.
- Tokens: Palette will be tuned to muted, high‑contrast hues; typography/spacing simplified to reduce border noise.
- Domain & Data: Unchanged from v1. No new runtime dependencies.

## Modules and Boundaries

- ui/: Vue components; presentational only. Imports from app/ only.
- app/: State and orchestration. Imports domain/, data/, shared/.
- domain/: Pure TypeScript functions for memory estimates. Imports shared/ only.
- data/: Read‑only catalogs for GPUs and models. Imports shared/ only.
- shared/: Types, constants, units utilities, and design tokens.

Allowed imports: UI→App; App→Domain|Data|Shared; Domain→Shared; Data→Shared. No back‑edges.

## Key Contracts (v2 relevant)

- Shared types (`src/shared/types.ts`) — unchanged.
- Domain API (`src/domain/memory.ts`) — unchanged.
- App/controller (`src/app/controller.ts`):
  - `buildPerGpuBars(state)` — segments for weights|kv|reserve|free (used by preview and results bars).
  - `computeDeploymentSuggestions(state, deploymentId)` — suggestion engine.
  - `applySuggestedMaxModelLen(state, deploymentId)` / `applySuggestedMaxNumSeqs(state, deploymentId)` — Apply actions.
  - Adjustable apply (UI): The UI seeds a numeric stepper with the suggestion and allows +/- nudge before applying. Implementation may either (a) set the chosen value directly on state (consistent with current UI pattern), or (b) add thin App setters, e.g., `setDeploymentWorkload(state, id, { maxNumSeqs })`. No domain changes.
  - `utilizationByGpu(state)`, `impliedReserveByGpu(state)`, `computeResultsStub(state)` — derived values powering bars and fit checks.

## Data Flow (Option A)

Stepper (GPUs → Models → Workload → Results)
  → App state updates (Pinia/reactive store)
  → App derives per‑GPU results (`computeResultsStub` → `buildPerGpuBars`)
  → UI Preview Panel (appears after any GPU is selected) + Results view both render bars
  → Suggestions shown in context for the currently active deployment with Apply actions.

State continues to live in App; Domain remains stateless and pure; Data is static JSON.

## Non‑Functionals

- Performance: UI updates target <16 ms per interaction for typical scenarios (<10 GPUs, <5 deployments). Avoid layout thrash in the sticky panel; prefer transform/opacity transitions.
- Accessibility: Keyboard nav across bar segments (Left/Right), focus order that avoids traps, ARIA labels summarizing segment kind, model, and size; WCAG AA color contrast.
- Controls: Numeric steppers for suggestions must be keyboard accessible (ArrowUp/Down), announce value changes to screen readers, and respect min/step semantics.
- Testability: Existing domain tests remain valid; light UI smoke tests for preview rendering and keyboard nav.
- Dependencies: No new runtime deps; tooltip/positioning remain custom and minimal; any future runtime dep requires an ADR.

## Risks & Mitigations

- Split attention between stepper and preview: Mitigate with subtle hierarchy (muted preview chrome, clear active deployment highlighting).
- Reduced bar width on small screens: Collapse non‑critical controls; allow preview to stack or switch to a compact density.
- Keyboard/ARIA complexity: Define explicit focus order and aria‑live announcements for suggestion updates.

## Build & Release (Carry‑over)

- CI: npm ci, typecheck, unit tests on PR/main. Node 20.x.
- CD: GitHub Pages via Actions; Vite base configured as in v1.
- Versioning: Same as v1; update ADR index when adding new ADRs.

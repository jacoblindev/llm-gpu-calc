# PRD: LLM GPU vRAM Calculator — Command Center Dashboard with Waffle Visualization (v3)

Slug: llm-gpu-calc

---

## Clarifying Questions (with agreed defaults)

1) Primary layout? — Command Center dashboard (cards + visualization), no stepper.
2) Default visualization? — Waffle (discrete grid) only in v3; bars/doughnuts out-of-scope.
3) Audience/devices? — Desktop-first; mobile supported with stacked accordions and single-column tiles.
4) Density? — Default 10×10 (Comfortable); optional 20×20 (Compact) toggle in the Viz controls.
5) Sorting/filtering defaults? — Sort by Status severity (Over > Warn > OK), then Used% desc; no filters active by default.
6) Accessibility? — Full keyboard navigation and ARIA labels; tile-level focusable interactions; WCAG AA color contrast.
7) Dependencies? — No new runtime deps; custom CSS/SVG only; ADR required before adding any new runtime library.

---

## Context

v2 introduced a refined UI with a guided stepper and a sticky preview. For v3 we pivot to a Command Center dashboard: always-visible editor cards (GPUs, Deployments/Models, Workload) and a visualization section using Waffle small multiples (one tile per GPU). Waffle grids provide a compact, glanceable “how full” view, while preserving clarity and performance.

## Goals

- Replace stepper with a single-surface dashboard for faster iteration and at-a-glance state.
- Use Waffle visualization (discrete grid) as the sole visual for v3, showing Used, Reserve, and Free; Used splits into Weights vs KV (aggregate).
- Provide robust sort and filter controls to triage constrained GPUs quickly.
- Maintain strong accessibility, performance (<16ms per typical interaction), and responsive behavior.
- Preserve domain math and module boundaries; no behavioral changes to calculations.

## Non-Goals

- No alternative chart types (bars, doughnuts, treemaps) in v3.
- No backend services, telemetry collection, or 3rd-party analytics.
- No new runtime dependencies (charting/positioning libs) without ADR.
- No changes to domain formulas or data catalogs.

## User Stories

- As an ML engineer, I select GPUs and immediately see per-GPU waffles update as I adjust models, TP, and workload.
- As a devops user, I sort by Status to surface Over/Warning GPUs, then filter by vendor to focus triage.
- As a keyboard-first user, I can navigate tiles, read accessible labels for Used/Reserve/Free, and open details without a mouse.
- As a mobile user, I expand the “GPUs/Deployments/Workload” accordions, then scroll a list of waffle tiles to inspect status.

## Acceptance Criteria

- Top Bar & KPIs
  - Top bar shows title and theme/unit toggles; visualization density and sort live in the Viz controls (not the top bar).
  - KPI strip shows: GPUs selected, Total capacity, Total used, Total implied reserve, Warnings count. Clicking “Warnings” applies Status=Warn/Over filter and scrolls to Viz.

- Cards Grid (Editor)
  - GPU Card: wraps current GPU selector; shows total selected.
  - Models/Deployments Card: wraps deployment creation/removal, model selection, and utilization share (U).
  - Workload Card: wraps assignment, TP auto-clamp (TP ≤ assigned GPUs), dtypes, overheads, max_model_len, and max_num_seqs.
  - Suggestions (optional for v3): may show constrained deployments with “Apply” using existing controller functions; can be deferred to v3.x.

- Visualization: Waffle Tiles
  - One tile per GPU in a responsive grid (auto-fill; min tile width ~260px desktop, ~220px mobile).
  - Each tile header: GPU name, capacity label, status badge (OK/Warning/Over) from fit checks.
  - Grid density: 10×10 default; 20×20 compact via a control. For very large GPU counts, auto-degrade to 10×10.
  - Encoding:
    - Map bytes to cells using fractions of capacity: Used, Reserve, Free.
    - Used is subdivided into two colors: Weights total vs KV total (aggregate across deployments). No per-deployment slicing in v3.
    - Cell fill order: left→right, top→bottom. Sum of Used+Reserve+Free cells equals N×N exactly (use largest remainder rounding).
  - Footer shows: “Used XX% • Reserve YY% • Free ZZ%”. Values reconcile with cell counts within rounding error.
  - Tooltip/focus reveals exact bytes and percentages for Used (with weights/kv split), Reserve, and Free.

- Viz Controls (Sort & Filter)
  - Sort options: Status severity, Used% desc, Free% asc, ΣU desc, Capacity desc, Name asc.
  - Filters: Status (OK/Warn/Over), Utilization (ΣU) range, Used% range, Free% range, Vendor/Type multi-select, By deployment, Text search by name/id.
  - “Only warnings” quick toggle applies Status=Warn/Over.
  - Controls are sticky within the Viz section on desktop; mobile shows compact chips and bottom sheet for sliders/multi-selects.

- Accessibility
  - Tiles are focusable with clear focus rings. Arrow keys move focus across tiles (Left/Right/Up/Down). Enter toggles “focus GPU” mode (optional) or announces details.
  - Each tile has an aria-label summarizing GPU name, capacity, Used/Reserve/Free, and status. Changes announce via aria-live.
  - Colors conform to WCAG AA in light/dark; do not rely on color alone (status badges include text/shape).

- Performance & Resilience
  - Typical scenarios (<10 GPUs, <5 deployments) update UI within 16ms interaction budget. For ≥32 GPUs with 20×20 density, maintain 60fps during hover and ≥30fps during mass updates; degrade to 10×10 automatically if needed.
  - Rendering uses CSS grid for cells; the interactive unit is the tile (not each cell) to keep DOM size manageable.

- Mobile Behavior
  - Editor cards collapse into accordions; only one open by default to reduce scroll.
  - Viz is single-column; tile content fits without horizontal scrolling. Provide a sticky “Back to Editor” button when scrolled into Viz.

- Persistence
  - Unit/theme prefs saved (existing behavior). Sort/filter density state persisted to URL query and/or localStorage; “Reset filters” clears state.

- Edge Cases
  - Zero GPUs: show calm placeholder in Viz; KPIs reflect zeros.
  - Mixed capacities: allowed; status/warnings base on per-GPU fit checks.
  - Tiny Used/Reserve/Free fractions: hide inline labels; show values in tooltip/ARIA only.

## UX Notes

- Visual hierarchy: calm KPI strip; evenly sized cards; Viz section dominates below.
- Legend uses existing domain colors for Weights, KV, Reserve, Free; placed in Viz controls.
- Status badges: OK (neutral), Warning (high utilization >95% or minimal KV not met), Over (over capacity / not OK).

## Risks & Assumptions

- Too many GPUs can overload the grid; mitigate via auto-density downgrade and virtualized scroll if necessary (virtualization can be deferred; avoid new deps).
- Discrete cells are an approximation; rounding must be stable to avoid flicker when values change slightly.
- Aggregating Used into weights vs kv loses per-deployment detail; acceptable for v3, with drill-down deferred.

## Telemetry & KPIs (non-collecting in v3)

- Success is measured manually via:
  - Time-to-first-visual after selecting GPUs (<1s on dev hardware).
  - Ability to triage Warnings quickly with Sort/Filter.
  - No regression in domain accuracy (unit tests passing).
- No analytics collection in v3. Consider adding optional instrumentation in a future version via ADR.

---

## Reference Architecture (lean)

- Keep layer-first: UI → App → Domain/Data/Shared; no back-edges. State remains in App; Domain pure.
- UI reads derived data via App/controller:
  - `computeResultsStub(state)` for KPIs and coarse metrics.
  - `buildPerGpuBars(state)` to source Used/Reserve/Free and weights/kv totals (aggregate by kind for waffles).
  - `buildPerGpuFitStatus(state)` for status badges and reasons.
- No changes to Domain or Data contracts.

## Module Decomposition Plan

Target layout additions (UI only):

- ui/dashboard/DashboardShell.vue
  - Responsibility: Page shell; composes TopBar, KPI strip, card grid, viz section, footer.
  - Public API: Props `{ state }` (or accesses App state via props from `App.vue`).
  - Internal: Sticky sections; responsive containers.

- ui/dashboard/KpiStrip.vue
  - Responsibility: Compute and display high-level KPIs from `computeResultsStub`.
  - Public API: Props `{ state }`.
  - Internal: Emits deep-link events to set filters (Warnings) in Viz.

- ui/dashboard/CardGrid.vue
  - Responsibility: Responsive grid container for editor cards.
  - Public API: Slots for cards.

- ui/dashboard/GpuCard.vue
  - Responsibility: Wrap existing `GpuSelector` inside a card chrome.
  - Public API: Props `{ state }`.

- ui/dashboard/ModelsCard.vue
  - Responsibility: Wrap `DeploymentModels` with trimmed controls appropriate for cards.
  - Public API: Props `{ state }`.

- ui/dashboard/WorkloadCard.vue
  - Responsibility: Wrap `DeploymentWorkload`; ensure compact layout.
  - Public API: Props `{ state }`.

- ui/dashboard/SuggestionsCard.vue (optional for v3)
  - Responsibility: Show constrained deployments and offer Apply actions using `applySuggestedMaxModelLen/NumSeqs`.
  - Public API: Props `{ state }`.

- ui/dashboard/VizSection.vue
  - Responsibility: Sort/filter controls, legend, and waffle grid composition.
  - Public API: Props `{ state }`.

- ui/viz/PerGpuWaffle.vue
  - Responsibility: Render waffle tiles based on aggregated data from `buildPerGpuBars` and fit status.
  - Public API: Props `{ state?; tiles?: ComputedInput[] }` to allow precomputed input for preview/testing.
  - Internal Notes: Bytes→cells mapping via largest remainder; focusable tiles; tooltip content; density switch.

Estimated file sizes: each 150–300 LOC; `PerGpuWaffle` ~250–350 LOC including a11y helpers.

## Suggested Size & Complexity Limits

- max_file_lines: 500; max_func_lines: 70; max_cyclomatic: 10 (heuristics).

## Shared Conventions

- Layer-first organization; UI imports App only. No Domain logic in UI.
- Keep props explicit, avoid one-letter identifiers, and ensure consistent naming.
- Centralize sort/filter state within `VizSection`; persist via query/localStorage.

## Test Strategy

- Preserve all domain/app tests; no changes to calculations.
- Add UI tests (where feasible) for:
  - Bytes→cells mapping totals (Used + Reserve + Free = N×N) for representative capacities.
  - Sort: Status severity primary, then Used% desc; stable ties.
  - Filters: Status, Vendor, and range sliders compose correctly.
  - A11y: Tiles are focusable; arrow navigation moves selection; aria-label content matches tile values.
- Update/remove obsolete UI tests in the same PR if prior stepper code paths are removed.
- Keep local runtime reasonable (under a few minutes).

## Dependency Policy

- No new runtime dependencies. If virtualization or a positioning utility becomes necessary, propose via a short ADR (alternatives, license, security posture) before adding.

---

## Glossary

- Waffle: Discrete N×N grid visualization mapping percentages to filled cells.
- Used: Sum of weights + KV bytes relative to capacity.
- Reserve: Implied runtime reserve fraction: `max(0, 1 − Σ U_d)`.
- Free: `max(0, capacity − reserve − used)`.
- Status: Result of fit checks per GPU (OK/Warning/Over) with reason.

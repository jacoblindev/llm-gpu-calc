# Architecture Overview (v3)

Primary drivers (v3): Viz‑first canvas with Waffle small multiples; dual overlay drawers (Editor/Insights) and a tile Inspector modal; Synthwave Minimal theme via CSS tokens; no domain changes.

## What Changed From v2

- Layout: Replace guided stepper + sticky preview with a Viz‑first canvas. Forms live in a left Control Dock (overlay); insights/suggestions live in a right drawer (overlay). A full‑screen tile Inspector provides details on demand.
- Visualization: Waffle tiles per GPU (10×10 default, 20×20 compact). Used subdivides into weights vs KV (aggregate). No per‑deployment slices in v3.
- Style: Optional `theme-synth` tokens (ADR‑0008) for a futuristic sci‑fi vibe without layout changes.

## Modules and Boundaries

- ui/: Presentational layer (shell, drawers, viz). Imports app/ only; consumes Pinia store via `useAppStore()`.
- app/: Pinia store + orchestration services. Imports domain/, data/, shared/.
- domain/: Pure logic for memory/fit. Imports shared/.
- data/: Static catalogs. Imports shared/.
- shared/: Types, units, preview helpers, tokens.

Allowed imports remain: UI→App; App→Domain|Data|Shared; Domain→Shared; Data→Shared.

## Key Contracts

- Store (Pinia) — `app/store.ts`
  - State: catalogs, selected GPU instances, counts by type, models, deployments, preferences (unit), and view prefs (sort/filter/density).
  - Actions: `init`, `loadUnitPreference`, `setUnit`, `setGpuCount`, `incrementGpu`, `addDeployment`, `removeDeployment`, `applySuggestedMaxModelLen`, `applySuggestedMaxNumSeqs`.
  - Getters: `resultsStub`, `perGpuBars`, `fitStatus`, `kpis`.
- Controller helpers (pure w.r.t. UI):
  - `app/controller.computeResultsStub(state)` — KPIs and capacities/used/reserve per GPU.
  - `app/controller.buildPerGpuBars(state)` — Used/Reserve/Free and per‑kind totals (aggregate weights/kv for waffles).
  - `app/controller.buildPerGpuFitStatus(state)` — Status (OK/Warn/Over) and reason per GPU.
  - Suggestion helpers consumed by store actions: `applySuggestedMaxModelLen/NumSeqs`.

## UI Composition (v3)

- Shell
  - CommandStrip: Title, KPI ribbon, chips (Sort, Filter, Density, Search); KPI “Warnings” opens Insights with Status filter applied.
  - VizCanvas: Waffle grid + sticky control row (sort/filter chips, legend).
  - ControlDock (Left): Tabbed editor (GPUs | Deployments/Models | Workload).
  - InsightsDrawer (Right): Fit list + Suggestions with Apply.
  - TileInspector (Modal): Per‑GPU detail (weights vs KV breakdown, per‑deployment table), keyboard and screen‑reader friendly.
  - FooterBar.

## Data Flow

- User edits in ControlDock → Store actions mutate Pinia state → Getters recompute (via controller) → VizCanvas re-renders waffles.
- KPI ribbon derives from `computeResultsStub` and fit status; “Warnings” deep‑links into Viz by setting Status filter and opening Insights.
- Sort/filter state is local to VizCanvas (persisted to URL/localStorage) and never mutates domain/app.

## Non‑Functionals

- Performance: Typical flows (<10 GPUs, <5 deployments) update within 16ms. For ≥32 GPUs at 20×20, degrade to 10×10 automatically to sustain 60fps hover and ≥30fps mass update.
- Accessibility: Overlay drawers and modal trap focus; ESC closes; aria‑labels summarize tile status (name, capacity, Used/Reserve/Free, status). Keyboard grid nav across tiles supports Arrow keys, Home/End (first/last), and PageUp/PageDown (jump one visible row).
- Stability: Drawers/modals are overlays to avoid layout shifts; no geometry changes on theme toggle (token‑only changes).

## Risks & Mitigations

- Too many tiles: auto‑density downgrade; consider virtualization later (ADR if new dependency).
- Rounding artifacts: use largest‑remainder to allocate N×N cells to Used/Reserve/Free; memoize mapping to avoid flicker.
- Complexity of overlays: limit to three primitives (dock, drawer, modal); shared a11y utilities for focus management.

## Implementation Notes

- Theme: `.theme-synth` and `.theme-synth.dark` override tokens (ADR‑0008). No spacing/breakpoint changes.
- New UI files (planned):
  - `ui/shell/DashboardShell.vue`, `ui/shell/CommandStrip.vue`
  - `ui/dock/ControlDock.vue`, `ui/dock/InsightsDrawer.vue`
  - `ui/viz/PerGpuWaffle.vue`, `ui/viz/VizControls.vue`
  - `ui/inspector/TileInspector.vue`
- Keep existing `GpuSelector`, `DeploymentModels`, `DeploymentWorkload`, `Legend` by wrapping them in the dock/drawer.
- Store plugin: synchronize `viewPrefs` (sort, filter, density) with URL/localStorage for deep-links and restore. Components read/write only via the Pinia store.

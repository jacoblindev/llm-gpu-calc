# PRD: LLM GPU vRAM Calculator — Command Center Dashboard with Waffle Visualization (v3)

Slug: llm-gpu-calc

---

## Clarifying Questions (with agreed defaults)

1) Primary layout? — Viz‑first canvas with overlay drawers (Control Dock + Insights), no stepper.
2) Default visualization? — Waffle (discrete grid) only in v3; bars/doughnuts out-of-scope.
3) Audience/devices? — Desktop-first; mobile canvas-first with bottom‑sheet editors and single-column tiles.
4) Density? — Default 10×10 (Comfortable); optional 20×20 (Compact) toggle in the Viz controls.
5) Sorting/filtering defaults? — Sort by Status severity (Over > Warn > OK), then Used% desc; no filters active by default.
6) Accessibility? — Full keyboard navigation and ARIA labels; tile-level focusable interactions; WCAG AA color contrast.
7) Dependencies? — No new runtime deps; custom CSS/SVG only; ADR required before adding any new runtime library.
8) Visual style? — Futuristic sci‑fi, but minimal and high‑contrast (“Synthwave Minimal”).

---

## Context

v2 introduced a refined UI with a guided stepper and a sticky preview. For v3 we pivot to a Viz‑first canvas: on‑demand overlay drawers host the editors (GPUs, Deployments/Models, Workload) while the visualization section using Waffle small multiples (one tile per GPU) remains primary. Waffle grids provide a compact, glanceable “how full” view, while preserving clarity and performance.

## Goals

- Replace stepper with a single-surface, Viz‑first canvas for faster iteration and at-a-glance state.
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
- As a mobile user, I open the bottom‑sheet editor (GPUs/Deployments/Workload), then scroll a list of waffle tiles to inspect status.

## Acceptance Criteria

- Top Bar & KPIs
  - Top bar shows title and theme/unit toggles; visualization density and sort live in the Viz controls (not the top bar).
  - KPI strip shows: GPUs selected, Total capacity, Total used, Total implied reserve, Warnings count. Clicking “Warnings” applies Status=Warn/Over filter and scrolls to Viz.

- Control Dock (Editor)
  - Tabbed editor overlays the canvas with three tabs: GPUs, Deployments/Models, Workload.
  - GPUs tab: wraps current GPU selector; shows total selected.
  - Deployments/Models tab: wraps deployment creation/removal, model selection, and utilization share (U).
  - Workload tab: wraps assignment, TP auto-clamp (TP ≤ assigned GPUs), dtypes, overheads, max_model_len, and max_num_seqs.
  - Suggestions are shown in the Insights drawer (see below) with Apply actions; the Control Dock focuses on editing inputs.

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
  - Per‑deployment detail is available in TileInspector: the Inspector MUST show a per‑deployment vRAM breakdown (weights and KV bytes) for the selected GPU to fully mitigate the loss of detail in the main waffle view.

- Layout & Navigation — Canvas + Dual Drawers
  - Default view is Viz‑first: the waffle grid fills the main canvas on both desktop and mobile.
  - Control Dock (left overlay drawer): Tabbed editor for GPUs, Deployments/Models, and Workload; opens over the canvas without reflow. Keyboard: `E` toggles; ESC closes; focus is trapped while open; opening returns focus to the invoker on close.
  - Insights Drawer (right overlay): Lists per‑GPU status (OK/Warn/Over with reason) and Suggestions (Apply: `applySuggestedMaxModelLen/NumSeqs`). Keyboard: `F` toggles; ESC closes; “Only warnings” chip toggles Status filter.
  - Tile Inspector (modal): Opens on tile click/Enter; shows per‑GPU details incl. weights vs KV and per‑deployment breakdown; focus is trapped; ESC or close button exits.
  - Command Strip: Top area with title, KPI ribbon, and compact chips (Sort, Filter, Density, Search). Clicking KPI “Warnings” opens Insights and applies Status=Warn/Over.
  - No layout shift: drawers and modal overlay the Viz; opening/closing cannot push content; page scroll remains stable.

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
  - Viz is single-column; tile content fits without horizontal scrolling. Provide a sticky “Back to Editor” button when scrolled into Viz.
  - Bottom Sheet Editor: Control Dock appears as a bottom sheet (draggable from 20% to 80% height); tiles remain visible underneath on open.
  - Insights Drawer becomes a full‑height sheet from the right; Inspector is a full‑screen modal.

- Persistence
  - Unit/theme prefs saved (existing behavior). Sort/filter/density state is synchronized to URL query and/or localStorage for deep-linking and restore.
  - App state is managed by a Pinia store; UI reads via `useAppStore()` and does not prop‑drill the entire state tree. Store actions wrap existing controller functions; getters expose derived data.
  - View‑specific state (sort, filter, density) also lives in the Pinia store (`viewPrefs`) and is synchronized with URL/localStorage via a lightweight subscriber/plugin. Components only interact with the store; they do not touch URL/localStorage directly.

- Edge Cases
  - Zero GPUs: show calm placeholder in Viz; KPIs reflect zeros.
  - Mixed capacities: allowed; status/warnings base on per-GPU fit checks.
  - Tiny Used/Reserve/Free fractions: hide inline labels; show values in tooltip/ARIA only.

## UX Notes

- Visual hierarchy: calm KPI strip; evenly sized cards; Viz section dominates below.
- Legend uses existing domain colors for Weights, KV, Reserve, Free; placed in Viz controls.
- Status badges: OK (neutral), Warning (high utilization >95% or minimal KV not met), Over (over capacity / not OK).

### Visual Design — Synthwave Minimal (styling spec)

- Palette tokens (theme alias: `theme-synth`)
  - Base: `--color-bg` #0B0F17; `--color-surface` #111827; `--border-color` #1F2937.
  - Text: `--color-text` #E5E7EB; `--color-muted` #94A3B8.
  - Accent: `--color-primary` #22D3EE (hover: #67E8F9).
  - Status: `--color-success` #10B981; `--color-warning` #F59E0B; `--color-danger` #F43F5E.
  - Viz/domain: `--color-weights` #8B5CF6; `--color-kv` #22D3EE; `--color-reserve` #334155; `--color-free` #16A34A.
- Typography
  - UI: Inter/SF system stack; numbers/labels may use JetBrains Mono for a tech accent.
  - Headings: slight tracking (+2%); all‑caps only for tiny labels; avoid heavy weight.
- Surfaces & shapes
  - Corners: `--radius-md` ~10px; subtle 1px inner stroke (`--panel-inner-stroke`: rgba(255,255,255,0.06)).
  - Borders: 1px using `--border-color`; minimal shadows.
- Motion
  - Micro interactions 140–180ms ease‑out; press translateY(1px); focus adds faint glow ring.
  - Respect `prefers-reduced-motion`: disable transform/glow animations.
- Background accents (optional, low opacity)
  - Radial gradient (cyan/purple) anchored top‑right at ~10–15% opacity.
  - Dot‑grid (24px spacing, 1px dots rgba(255,255,255,0.04)) beneath panels.
- Controls
  - Buttons: flat with border and tiny outer glow on hover; active chip styles for sort/filter.
  - Focus: high‑contrast ring + faint cyan glow (`--ring-glow`).
- Waffle tiles
  - 1px cell gaps; Used splits weights (violet) vs kv (cyan); Reserve deep slate; Free near‑bg.
  - Tile hover: slight lift + cyan‑tinted border; tooltip uses monospace numerics.
- Accessibility
  - Maintain AA contrast in both light/dark; never rely on color alone for status (always include text/badges).
- Implementation notes
  - Add a `theme-synth` class on `<html>` that overrides CSS variables in `src/styles/tokens.css` (and `theme-synth.dark` variant).
  - New tokens: `--ring-glow`, `--grid-dot`, `--panel-inner-stroke`, and reuse `--radius-md`.
  - Add a TopBar theme menu entry to toggle `theme-synth`; persist user choice in localStorage.

### Keyboard Shortcuts (discoverable via `?`)

- `E`: Toggle Control Dock (Editor)
- `F`: Toggle Insights Drawer
- Arrow keys: Move tile focus; `Enter`: open Inspector; `Esc`: close overlay/drawer
- `Home` / `End`: Jump to first / last tile
- `PageUp` / `PageDown`: Jump by one full visible row of tiles
- `/`: Focus search; `G/M/W`: Jump to GPUs/Models/Workload tabs when Control Dock is open

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
- State management: Use Pinia for the App store. UI components consume the store via `useAppStore()` rather than prop-drilling the whole state.
- UI reads derived data via App/controller and store getters:
  - `computeResultsStub(state)` for KPIs and coarse metrics.
  - `buildPerGpuBars(state)` to source Used/Reserve/Free and weights/kv totals (aggregate by kind for waffles).
  - `buildPerGpuFitStatus(state)` for status badges and reasons.
- No changes to Domain or Data contracts.

## Module Decomposition Plan

Target layout additions (UI only):

- ui/shell/DashboardShell.vue
  - Responsibility: Page shell; composes CommandStrip, VizCanvas, ControlDock, InsightsDrawer, TileInspector, FooterBar.
  - Public API: Props `{ state }` (or consumes Pinia store).
  - Internal: Sticky sections; overlay management (no layout shift).

- ui/shell/CommandStrip.vue
  - Responsibility: Title, KPI ribbon, quick chips (Sort, Filter, Density, Search) and KPI deep-links.
  - Public API: Emits filter/sort changes for VizCanvas and toggles drawers.

- ui/viz/VizCanvas.vue (or VizSection.vue)
  - Responsibility: Sort/filter controls row, legend, and waffle grid composition.
  - Public API: Props `{ state }`; emits open/inspect events; persists view prefs.

- ui/dock/ControlDock.vue
  - Responsibility: Left overlay drawer with tabs (GPUs | Deployments/Models | Workload) wrapping existing editors.
  - Public API: Props `{ state }`; keyboard a11y (focus trap, ESC, return focus).

- ui/dock/InsightsDrawer.vue
  - Responsibility: Right overlay with Fit list + Suggestions (Apply actions using controller helpers).
  - Public API: Props `{ state }`; exposes “Only warnings” toggle.

- ui/inspector/TileInspector.vue
  - Responsibility: Modal with per‑GPU detail view (weights vs KV, per‑deployment breakdown) and actions.
  - Public API: Props for selected GPU.

- ui/viz/PerGpuWaffle.vue
  - Responsibility: Render waffle tiles based on aggregated data from `buildPerGpuBars` and fit status.
  - Public API: Props `{ state?; tiles?: ComputedInput[] }` to allow precomputed input for preview/testing.
  - Internal Notes: Bytes→cells mapping via largest remainder; focusable tiles; tooltip content; density switch.

Estimated file sizes: each 150–300 LOC; `PerGpuWaffle` ~250–350 LOC including a11y helpers.

App state (Pinia):

- app/store.ts (new)
  - Responsibility: Central app store using Pinia; owns state previously passed via `reactive(createInitialState())`.
  - State: `gpuCatalog`, `gpus`, `gpuCounts`, `models`, `deployments`, `utilization`, `reserveBytes`, `unit`.
  - Actions: `init()`, `loadUnitPreference()`, `setUnit(unit)`, `setGpuCount(typeId, n)`, `incrementGpu(typeId, delta)`, `addDeployment()`, `removeDeployment(id)`, `applySuggestedMaxModelLen(id)`, `applySuggestedMaxNumSeqs(id)` — these wrap functions in `app/controller.ts` and update store state.
  - Getters: `resultsStub`, `perGpuBars`, `fitStatus`, `kpis` (aggregate KPIs), and view prefs (sort/filter/density) persisted to localStorage/URL.
  - Notes: Getters delegate to existing controller functions; Domain remains pure.

## Suggested Size & Complexity Limits

- max_file_lines: 500; max_func_lines: 70; max_cyclomatic: 10 (heuristics).

## Shared Conventions

- Layer-first organization; UI imports App only. No Domain logic in UI.
- Keep props explicit, avoid one-letter identifiers, and ensure consistent naming.
- Centralize sort/filter/density state in the Pinia store (`viewPrefs`); `VizCanvas` consumes and updates the store. Persistence to URL/localStorage occurs via a store subscriber/plugin.

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

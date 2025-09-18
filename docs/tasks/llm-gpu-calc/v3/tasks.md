# Tasks: Viz‑First Dashboard (v3) — Waffle + Drawers

Slug: llm-gpu-calc

Traceability: PRD `docs/prd/llm-gpu-calc/v3/prd.md`, ARCH `docs/architecture/ARCH-v3.md`, ADRs `docs/adr/ADR-0008-synthwave-minimal-theme-tokens.md`, `docs/adr/ADR-0009-v3-ui-shell-viz-first-drawers.md`

Repo assessment (concise)

- Stack: Vue 3 + TS + Vite + Tailwind; Pinia store; custom SVG; tests via Vitest.
- Current UI: Stepper + preview (v2); migrating to viz‑first canvas with overlays.
- Risks: overlay a11y (focus traps, ESC, return‑focus), waffle performance at high GPU counts, bytes→cells rounding flicker, centralizing viewPrefs and syncing URL/localStorage.

---

- [x] 0.0 Establish architecture scaffolding
  - [x] 0.1 Create layout & component stubs per ARCH‑v3 (UI→App boundaries)
    - Acceptance: Stubs for DashboardShell, CommandStrip, VizCanvas, PerGpuWaffle, VizControls, ControlDock, InsightsDrawer, TileInspector, app/store.ts compile; app builds and typechecks.
    - Gates: Boundaries (ARCH‑v3); no new runtime deps.
    - Traceability: PRD Module Plan; ARCH‑v3 UI Composition.
    - Est: 2h
  - [x] 0.2 Feature‑flag new shell; keep existing App path available
    - Acceptance: Toggle between current App and DashboardShell for incremental dev.
      - Enabled via `?v3=1` or localStorage `useV3Shell=1`; env `VITE_V3_SHELL` also supported.
    - Gates: Tests (smoke), Boundaries.
    - Traceability: ARCH‑v3 Implementation Notes.
    - Est: 1h
  - [x] 0.3 Confirm dependency policy (no new runtime deps); ADR required for exceptions
    - Acceptance: Tasks/docs reflect policy; ADRs referenced. Confirmed: No new runtime deps in v3; any virtualization/positioning lib requires ADR per ADR‑0004.
    - Gates: Dependency policy.
    - Traceability: PRD Dependency Policy; ADR‑0004; ADR‑0008/0009.
    - Est: 0.5h

- [x] 1.0 Pinia store + viewPrefs
  - [x] 1.1 Consolidate app state into `useAppStore()`; wrap controller fns as actions
    - Acceptance: Store owns GPUs, models, deployments, prefs; actions: init, setUnit, loadUnitPreference, setGpuCount, incrementGpu, add/remove deployment, applySuggested…
    - Gates: Boundaries; Tests (basic store unit tests if feasible).
    - Traceability: PRD Reference Architecture; ARCH‑v3 Key Contracts.
    - Est: 2h
  - [x] 1.2 Getters for derived data (resultsStub, perGpuBars, fitStatus, kpis)
    - Acceptance: Getters delegate to controller; deterministic given state; no UI logic in store.
    - Gates: Tests (smoke), Boundaries.
    - Traceability: PRD Module Plan; ARCH‑v3 Key Contracts.
    - Est: 1h
  - [x] 1.3 `viewPrefs` in store + sync plugin (URL/localStorage)
    - Acceptance: Sort/filter/density in store; persists across reloads; shareable via URL.
    - Gates: Tests (persist/restore), no direct component access to URL/localStorage.
    - Traceability: PRD Persistence; ARCH‑v3 Implementation Notes.
    - Est: 1–2h

- [ ] 2.0 VizCanvas + Waffle visualization
  - [x] 2.1 Bytes→cells mapping with largest‑remainder rounding
    - Acceptance: Used+Reserve+Free cells == N×N across representative inputs; stable under small changes.
    - Gates: Tests (mapping totals); Boundaries.
    - Traceability: PRD Visualization; ARCH‑v3 Risks & Mitigations.
    - Est: 2h
  - [x] 2.2 Render tiles grid (10×10 default; 20×20 compact)
    - Acceptance: Responsive auto‑fill grid; headers (name/capacity/status); footers with Used/Reserve/Free.
    - Gates: Visual check; A11y labels present.
    - Traceability: PRD Acceptance (Waffle Tiles).
    - Est: 2h
  - [x] 2.3 Sticky controls row (sort/filter chips, legend) bound to `viewPrefs`
    - Acceptance: Controls update store; legend uses tokens; sticky in Viz only.
    - Gates: Boundaries; Tests (store updates reflect in view).
    - Traceability: PRD Viz Controls; ARCH‑v3 Data Flow.
    - Est: 1–2h
  - [x] 2.4 Performance guard: auto‑downgrade density when GPU count high
    - Acceptance: Threshold implemented (e.g., ≥32 GPUs → 10×10); smooth hover/scroll.
    - Gates: Manual perf check.
    - Traceability: PRD Performance; ARCH‑v3 Non‑Functionals.
    - Est: 1h

- [ ] 3.0 ControlDock (left overlay)
  - [ ] 3.1 Tabbed editor wrapping existing GPUs / Deployments / Workload
    - Acceptance: Editors work as before; no layout shift; return focus to toggle on close.
    - Gates: Boundaries; Tests (smoke interactions).
    - Traceability: PRD Layout & Navigation; ARCH‑v3 UI Composition.
    - Est: 2–3h
  - [ ] 3.2 Overlay a11y (focus trap, ESC, return‑focus)
    - Acceptance: Verified with keyboard only; screen reader announces open/close.
    - Gates: Accessibility.
    - Traceability: PRD Accessibility.
    - Est: 1h
  - [ ] 3.3 Keyboard shortcuts: `E` toggle; `G/M/W` jump tabs
    - Acceptance: Shortcuts work; respects focused inputs (no stealing focus).
    - Gates: Accessibility.
    - Traceability: PRD Keyboard Shortcuts.
    - Est: 0.5–1h

- [ ] 4.0 InsightsDrawer (right overlay)
  - [ ] 4.1 Fit status list from `buildPerGpuFitStatus`
    - Acceptance: Deterministic display; status badges reflect reasons.
    - Gates: Tests (smoke), Boundaries.
    - Traceability: PRD Acceptance (Layout & Navigation), ARCH‑v3 Key Contracts.
    - Est: 1–2h
  - [ ] 4.2 Suggestions with Apply actions
    - Acceptance: Apply updates state via store actions; re-renders Viz.
    - Gates: Tests (apply paths), Boundaries.
    - Traceability: PRD Acceptance (Suggestions via Insights), ARCH‑v3.
    - Est: 1–2h
  - [ ] 4.3 “Only warnings” chip integrates with `viewPrefs` and opens drawer (`F`)
    - Acceptance: Clicking KPI Warnings sets filter + opens drawer; keyboard `F` toggles.
    - Gates: Accessibility; Tests (interaction).
    - Traceability: PRD KPI Deep‑links; Viz Controls.
    - Est: 0.5–1h

- [ ] 5.0 TileInspector (modal)
  - [ ] 5.1 Modal open (click/Enter) and full‑screen on mobile
    - Acceptance: Works on desktop/mobile; traps focus; ESC closes; restores focus.
    - Gates: Accessibility.
    - Traceability: PRD Layout & Navigation.
    - Est: 1–2h
  - [ ] 5.2 MUST show per‑deployment vRAM breakdown (weights + KV) for selected GPU
    - Acceptance: Table lists deployments assigned to GPU with weights/KV bytes; sums align with Used.
    - Gates: Tests (data integrity); Boundaries.
    - Traceability: PRD Visualization (Inspector detail); ARCH‑v3 UI Composition.
    - Est: 1–2h
  - [ ] 5.3 Optional quick‑apply suggestions from Inspector
    - Acceptance: Action applies suggestion via store and closes/updates view.
    - Gates: Tests (apply path), Boundaries.
    - Traceability: PRD Suggestions; ARCH‑v3.
    - Est: 0.5–1h

- [ ] 6.0 CommandStrip + KPI ribbon
  - [ ] 6.1 KPIs from getters; Warnings deep‑link
    - Acceptance: KPIs accurate; clicking Warnings opens Insights with Status filter set.
    - Gates: Tests (smoke), Boundaries.
    - Traceability: PRD Top Bar & KPIs; ARCH‑v3 Data Flow.
    - Est: 1h
  - [ ] 6.2 Quick chips (Sort, Filter, Density, Search) update `viewPrefs`
    - Acceptance: Chips reflect state and update store; Search filters tiles.
    - Gates: Tests (store updates), Accessibility (focus).
    - Traceability: PRD Viz Controls; Persistence.
    - Est: 1–2h

- [ ] 7.0 Sort and Filter behavior
  - [ ] 7.1 Implement sort keys and stable ties
    - Acceptance: Status severity (Over>Warn>OK), then Used% desc, etc.; stable sort.
    - Gates: Tests (sort determinism).
    - Traceability: PRD Sort Options.
    - Est: 1–2h
  - [ ] 7.2 Implement filters (status/ranges/vendor/deployment/search)
    - Acceptance: Filters compose; reset clears all; URL share works.
    - Gates: Tests (composition), Persistence plugin verified.
    - Traceability: PRD Filters; Persistence.
    - Est: 2–3h
  - [ ] 7.3 (Stretch Goal) Group‑by vendor/type
    - Acceptance: Buckets rendered; sort within groups.
    - Gates: Tests (smoke).
    - Traceability: PRD Viz Controls (optional).
    - Est: 1h

- [ ] 8.0 Keyboard & Accessibility
  - [ ] 8.1 Grid navigation: Arrow + Home/End + PageUp/PageDown
    - Acceptance: Keyboard traversal matches expectations; focus rings visible.
    - Gates: Accessibility; Tests (smoke nav).
    - Traceability: PRD Keyboard Shortcuts; ARCH‑v3 Non‑Functionals.
    - Est: 1–2h
  - [ ] 8.2 Tile aria‑labels and live announcements
    - Acceptance: Labels include name, capacity, Used/Reserve/Free, status; aria‑live announces changes.
    - Gates: Accessibility.
    - Traceability: PRD Accessibility.
    - Est: 1h
  - [ ] 8.3 Drawers/Modal a11y checks (trap/ESC/return‑focus)
    - Acceptance: Pass manual checklist.
    - Gates: Accessibility.
    - Traceability: PRD Accessibility; ARCH‑v3 Non‑Functionals.
    - Est: 1h

- [ ] 9.0 Synthwave theme tokens + toggle
  - [ ] 9.1 Add `.theme-synth` + `.theme-synth.dark` token overrides
    - Acceptance: Token block added; AA contrast verified; no layout shift.
    - Gates: Visual check.
    - Traceability: ADR‑0008; PRD Visual Design.
    - Est: 1–2h
  - [ ] 9.2 Style toggle in CommandStrip; persist preference
    - Acceptance: Toggle adds/removes `theme-synth` on `<html>`; persisted in localStorage.
    - Gates: Tests (persistence best‑effort), respects reduced motion.
    - Traceability: PRD Visual Design; ARCH‑v3 Implementation Notes.
    - Est: 1h

- [ ] 10.0 Wire‑up + migration
  - [ ] 10.1 Replace stepper shell with DashboardShell (feature‑flagged)
    - Acceptance: New shell is default when flag on; fall back available.
    - Gates: Tests (smoke), Boundaries.
    - Traceability: PRD Layout & Navigation; ARCH‑v3.
    - Est: 1–2h
  - [ ] 10.2 Swap Results to VizCanvas (Waffle); keep Legend
    - Acceptance: Legacy results replaced; Legend reused; parity on numbers.
    - Gates: Tests (numbers parity), Boundaries.
    - Traceability: PRD Visualization; ARCH‑v3.
    - Est: 1–2h
  - [ ] 10.3 Remove obsolete UI after parity
    - Acceptance: Dead components removed; no unused exports.
    - Gates: Repo hygiene.
    - Traceability: Tasks hygiene.
    - Est: 0.5h

- [ ] X.0 Align & prune tests
  - [ ] X.1 Remove/update tests that no longer match the UI flow (same PR)
    - Acceptance: No spurious failures from UI changes; tests updated or removed.
    - Gates: Tests.
    - Traceability: Rules — Align & prune tests.
    - Est: 0.5–1h
  - [ ] X.2 Add/adjust tests for new public behavior only (waffle mapping, viewPrefs, overlays a11y)
    - Acceptance: Smoke tests cover waffle mapping, viewPrefs persistence, keyboard/overlay a11y; deep‑link behavior (clicking KPI “Warnings” updates viewPrefs Status filter and opens InsightsDrawer); domain tests unaffected.
    - Gates: Tests; Boundaries.
    - Traceability: PRD Test Strategy; ARCH‑v3.
    - Est: 1–2h
  - [ ] X.3 Keep runtime reasonable; avoid brittle snapshots
    - Acceptance: `npm test` + typecheck complete quickly locally.
    - Gates: Test runtime.
    - Traceability: Rules — Generate Tasks (runtime budget).
    - Est: 0.5h

Gates (apply to every sub‑task)

- Tests: Public behavior covered; obsolete tests updated/removed in the same PR.
- Boundaries: Imports respect `docs/architecture/ARCH-v3.md` and public APIs; deviations documented (ADR/update ARCH).
- Dependencies: Any new runtime dep requires a short ADR under `docs/adr/` and approval.

Notes

- Frontend‑only; domain formulas unchanged.
- Viz is waffle‑only in v3; per‑deployment detail is available in Inspector.
- Pause/confirm parent list before expanding sub‑tasks per rules/process-task-list.md.

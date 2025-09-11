# Tasks: UI/UX Refresh (v2) — Option A

Slug: llm-gpu-calc

Traceability: PRD `docs/prd/llm-gpu-calc/v2/prd.md`, ARCH `docs/architecture/ARCH-v2.md`, ADR `docs/adr/ADR-0007-ui-ux-refresh-option-a.md`

Repo assessment (concise)

- Stack: Vue 3 + TS + Vite + Tailwind; custom SVG bars; Pinia‑style reactive state.
- Tests: `npm test` (Vitest); typecheck via `npm run typecheck`.
- Risks: sticky preview performance, keyboard/ARIA complexity, small‑screen bar readability.

---

- [x] 0.0 Establish architecture scaffolding
  - [x] 0.1 Create layout & component stubs for preview panel and top bar per ARCH‑v2 (UI→App boundaries)
    - Acceptance: Components compile; exported via `src/ui/index.ts` if needed; app builds and typechecks.
    - Gates: Boundaries per ARCH‑v2; no runtime deps.
    - Traceability: PRD Module Plan; ARCH‑v2 Modules & Key Contracts.
    - Est: 1–2h
  - [x] 0.2 Wire preview visibility to GPU selection; do not render bars until at least one GPU is selected (empty deployment allowed)
    - Acceptance: Selecting first GPU shows preview; removing last GPU hides preview; state remains intact.
    - Gates: Tests (simple smoke); Boundaries.
    - Traceability: PRD UX Notes (First‑run); ARCH‑v2 Data Flow.
    - Est: 1h
  - [x] 0.3 Confirm dep policy (no new runtime deps in v2); ADR required for any exception
    - Acceptance: Tasks/readme reflect policy; ADR‑0007 references no‑new‑deps; any exception requires ADR.
    - Gates: Dependency.
    - Traceability: PRD Dependency Policy; ADR‑0004; ADR‑0007.
    - Est: 0.5h

- [x] 1.0 Results Preview (bars) in guided flow
  - [x] 1.1 Reuse `app/controller.buildPerGpuBars` in a compact Preview panel; share segment labeling with Results
    - Acceptance: Preview renders per‑GPU bars after selection; composition matches Results.
    - Gates: Boundaries; no duplicated domain logic in UI.
    - Traceability: ARCH‑v2 App/controller; PRD Visualization.
    - Est: 1–2h
  - [x] 1.2 Labels only for segments ≥10% width; tooltip/ARIA for smaller segments; keyboard Left/Right across segments
    - Acceptance: Inline labels threshold works; tooltips show model/kind/size/%; keyboard nav traverses segments.
    - Gates: Accessibility (WCAG AA); Tests (smoke for nav/labels).
    - Traceability: PRD Acceptance (Visualization, Accessibility).
    - Est: 1–2h
  - [x] 1.3 Performance: keep updates <16 ms; avoid layout thrash (transform/opacity only)
    - Acceptance: Manual test shows smooth updates; no forced synchronous reflow hotspots.
    - Gates: Manual perf check.
    - Traceability: PRD Goals; ARCH‑v2 Non‑Functionals.
    - Est: 1h
  - [x] 1.4 Responsive readability on small screens; collapse non‑critical controls
    - Acceptance: Bars remain legible at narrow widths; controls wrap or collapse without overlap.
    - Gates: Visual check.
    - Traceability: PRD UX Notes.
    - Est: 1h

- [ ] 2.0 Recommendations in context (adjustable + Apply)
  - [x] 2.1 Seed adjustable controls with `computeDeploymentSuggestions` for active deployment
    - Acceptance: Suggested values visible; safety factor (0.98) applied; hover reveals raw value.
    - Gates: Boundaries; Tests (deterministic suggestion rendering).
    - Traceability: PRD Recommendations; ARCH‑v2 Key Contracts.
    - Est: 1h
  - [x] 2.2 Controls: `max_num_seqs` step 1 (min 1); `max_model_len` step 128; allow direct numeric entry
    - Acceptance: Steppers and inputs enforce min/step; keyboard ArrowUp/Down works.
    - Gates: Accessibility; Tests (input/step behavior).
    - Traceability: PRD Detailed Behavior (Adjustable suggestions).
    - Est: 1–2h
  - [ ] 2.3 Live preview recalculates on adjustment (pre‑Apply) without mutating state; Apply commits via App (`applySuggested…` or setter)
    - Acceptance: Adjust → preview updates using temporary UI state only (main App state unchanged); Apply → chosen value persisted to App state and re-renders; Apply disabled when invalid.
    - Gates: Tests (adjust+apply paths); Boundaries.
    - Traceability: PRD Acceptance (Recommendations); ARCH‑v2 App/controller.
    - Est: 1–2h
  - [ ] 2.4 Validation and constraints
    - Acceptance: Prevent values that violate constraints or below minimums; show concise inline message.
    - Gates: Tests.
    - Traceability: PRD Validation & Warnings.
    - Est: 0.5–1h

- [ ] 3.0 Visual language & tokens
  - [ ] 3.1 Tune `src/styles/tokens.css` to muted Apple‑like palette; maintain AA contrast in dark/light
    - Acceptance: Color variables updated; contrast verified; no regressions in existing components.
    - Gates: N/A; Boundaries unaffected.
    - Traceability: PRD UX Notes (Visual Language).
    - Est: 1h
  - [ ] 3.2 Spacing, borders, typography; system font stack; subtle transitions (150–200 ms) with `prefers-reduced-motion`
    - Acceptance: Reduced border noise; increased whitespace; system font applied; transitions feel subtle.
    - Gates: N/A; No logic changes.
    - Traceability: PRD Visual Language; ARCH‑v2 Non‑Functionals.
    - Est: 1–2h

- [ ] 4.0 Accessibility & keyboard nav
  - [ ] 4.1 ARIA: segments have role/labels “`model` `component`: `size` (`pct`)”
    - Acceptance: Screen readers read labels for each segment; preview has accessible name.
    - Gates: Accessibility (manual check).
    - Traceability: PRD Accessibility; ARCH‑v2 Non‑Functionals.
    - Est: 1h
  - [ ] 4.2 Focus order avoids traps; Tab cycles bars/controls; Arrow keys move within bar segments; outline visible
    - Acceptance: Keyboard walkthrough passes; no dead‑ends; visual focus state present.
    - Gates: Accessibility; Tests (smoke nav).
    - Traceability: PRD Accessibility.
    - Est: 1–2h
  - [ ] 4.3 Announce suggestion value changes; enforce min/step semantics
    - Acceptance: Value changes announced; invalid entries corrected or blocked with hint.
    - Gates: Accessibility.
    - Traceability: PRD Recommendations (Adjustable); ARCH‑v2 Controls.
    - Est: 1h

- [ ] 5.0 Fit/warnings in preview
  - [ ] 5.1 Show ΣU and implied reserve per GPU; reflect warnings when ΣU>0.95 and errors when over capacity/min KV not viable
    - Acceptance: Deterministic state renders expected warnings/errors.
    - Gates: Tests (assertion); Boundaries.
    - Traceability: PRD Validation & Warnings; ADR‑0005.
    - Est: 1–2h
  - [ ] 5.2 Non‑intrusive notice styling; link to details in Results view
    - Acceptance: Notices are concise; link navigates to full Results; no modals.
    - Gates: N/A.
    - Traceability: PRD Visualization.
    - Est: 0.5h

- [ ] X.0 Align & prune tests
  - [ ] X.1 Remove/update tests that no longer match the UI flow (same PR)
    - Acceptance: No spurious failures from UI changes; tests updated or removed.
    - Gates: Tests.
    - Traceability: Rules — Align & prune tests.
    - Est: 0.5–1h
  - [ ] X.2 Add/adjust tests for new public behavior only (preview rendering, keyboard nav, adjustable Apply)
    - Acceptance: Smoke tests cover preview rendering, keyboard nav, adjustable Apply; domain tests unaffected.
    - Gates: Tests; Boundaries.
    - Traceability: PRD Test Strategy; ARCH‑v2.
    - Est: 1–2h
  - [ ] X.3 Keep runtime reasonable; rely on unit/smoke tests; avoid brittle snapshots
    - Acceptance: `npm test` + typecheck complete quickly locally.
    - Gates: Test runtime.
    - Traceability: Rules — Generate Tasks (runtime budget).
    - Est: 0.5h

Gates (apply to every sub‑task)

- Tests: Public behavior covered; obsolete tests updated/removed in the same PR.
- Boundaries: Imports respect `docs/architecture/ARCH-v2.md` and public APIs; deviations documented (ADR/update ARCH).
- Dependencies: Any new runtime dep requires a short ADR under `docs/adr/` and approval.

Notes

- Frontend‑only; domain formulas unchanged.
- Consider a Canvas (split) mode toggle in a later parent after v2 base lands.

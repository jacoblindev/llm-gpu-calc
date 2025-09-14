# PRD: LLM GPU vRAM Calculator — UI/UX Refresh (v2)

Slug: llm-gpu-calc

---

## Clarifying Questions (proposed defaults in italics)

1) Flow: Keep the stepper or move to a split layout (left controls, right results) with instant feedback? — _Default: guided stepper with a sticky results preview visible once GPUs are selected; optional Canvas (split) mode toggle._
2) Visual weight: Should GPU bars be the first thing users see on load (with sensible defaults prefilled)? — _Default: show bars only after the user selects GPUs; start with an empty deployment._
3) Dark mode: Support auto (`prefers-color-scheme`), manual toggle, or both? — _Default: both; auto-detect + toggle in top bar._
4) Typography/spacing: Is the Apple-style minimalism primarily about whitespace, subtle depth, and SF system fonts without heavy borders? — _Default: yes; reduce borders, prefer soft elevation and clean type scale._
5) Color semantics: Keep current domain colors or tune a more muted palette closer to Apple’s aesthetic (while preserving contrast)? — _Default: tune to muted palette; preserve AA contrast; keep green/orange for success/warning cues._
6) Dependencies: OK to add a light UI utility (e.g., popover positioning) if needed, behind an ADR? — _Default: avoid new runtime deps in v2; use existing CSS/JS for tooltips; ADR if absolutely necessary._
7) Scope: Frontend-only refactor; no backend and no live GPU/device introspection? — _Default: yes; frontend-only._
8) Accessibility: Target full keyboard navigation and screen-reader labels for bar segments and controls? — _Default: yes (WCAG AA)._

---

## Context

v1 delivers a functional calculator with a guided stepper and custom SVG bars. v2 focuses on a refined, calm interface that makes the per‑GPU vRAM visualization the hero. Interactions should feel instant, legible, and respectful of user attention, mirroring Apple’s clean, modern minimalism.

## Goals

- Elevate the per‑GPU vRAM visualization to the primary canvas, visible while adjusting inputs once GPUs are selected.
- Streamline the flow: adopt a guided stepper with a sticky results preview (Option A); consider a Canvas (split) mode as a later toggle.
- Integrate in‑context recommendations for `--max-model-len` and `--max-num-seqs` with one‑click Apply and clear rationale.
- Improve readability and focus via Apple‑style minimalism: ample whitespace, subtle depth, crisp typography, gentle motion.
- Ensure responsive design, strong accessibility (keyboard/ARIA), and fast updates (<16ms frame budget for UI updates).

## Non‑Goals

- No backend services, live hardware probing, or performance telemetry in v2.
- No change to domain formulas/assumptions beyond visual/UX improvements.
- No chart library introduction unless approved via ADR; keep custom SVG bars.
- No analytics/3rd‑party tracking in v2.

## User Stories

- As an ML engineer, I select GPUs and immediately see bars update as I adjust models, TP, and workload.
- As a devops user, I open a deployment’s panel and apply suggested `--max-model-len` or `--max-num-seqs` with one click.
- As an accessibility user, I can navigate bar segments by keyboard and read text equivalents for each segment.
- As a newcomer, I can follow a guided mode (stepper) the first time, then switch to the split layout for quicker iteration.

## Acceptance Criteria

- Flow & layout: Provide one of the following (default A):
  - A) Guided stepper with a sticky results preview panel that appears as soon as GPUs are selected (always visible thereafter).
  - B) Split (Canvas) layout with controls on the left and bars on the right (toggle from guided mode).
  A top bar provides title, theme toggle, and unit toggle.
- Visualization (hero):
  - One bar per GPU with segmented stacks for weights, KV, implied reserve, and free.
  - Labels: show inline labels only for segments ≥10% width; otherwise use accessible tooltips/ARIA.
  - Hover/focus tooltips are positioned near the segment; keyboard arrows move focus across segments.
  - Performance: updating inputs re-renders bars within 16ms for typical scenarios (<10 GPUs, <5 deployments).
- Recommendations:
  - For each deployment, display suggested `--max-model-len` (given `max_num_seqs`) and `--max-num-seqs` (given `max_model_len`), computed from the current budget.
  - Suggestions are adjustable prior to applying: provide +/- controls and a numeric input.
    - For `--max-num-seqs`: step = 1; min = 1.
    - For `--max-model-len`: default step = 128 tokens; allow direct entry for exact values.
  - “Apply” uses the currently adjusted value and re-renders; the source formula is referenced in help text.
  - Safety factor (0.98) is applied; show raw vs adjusted value on hover.
- Controls:
  - GPU selection: pick from catalog; multi-select; reorder optional.
  - Deployments: per‑deployment TP, dtype selections, utilization share (U), and GPU assignment with validation that `tp ≤ assignedGpuIds.length`.
  - Units toggle (GiB/GB) affects labels globally; internal math remains bytes.
- Validation & Warnings:
  - Warn if `Σ U_d > 0.95` on any GPU; error if over capacity or minimal KV viability fails.
  - Disabled “Apply” when a suggestion would violate constraints.
- Accessibility:
  - All segments have `role="img"` or equivalent and `aria-label` with model/component and size.
  - Keyboard navigation: Left/Right within a bar; Tab cycles bars and controls.
  - Color contrast meets WCAG AA in both themes.
- Visual Language (Apple‑style minimalism):
  - System fonts (SF, -apple-system); generous whitespace; reduced border noise; soft shadows/elevation only where needed.
  - Color palette tuned to muted, modern hues; success/warn colors reserved for state, not decoration.
  - Subtle transitions (150–200ms) on hover/focus; no gratuitous motion.

## UX Notes

- First‑run experience: Bars are hidden until the user selects one or more GPUs. After selection (with an empty deployment), show bars emphasizing the unallocated/reserve segment and a calm prompt to pick a model.
- Density controls: Compact mode for small screens; larger spacing on wide screens.
- Persistent state: Persist unit preference and theme to localStorage.
- Tooltips: Use custom JS/CSS (no dependency) with pointer and focus support.
- Empty states: When no GPUs/deployments selected, show calm guidance rather than empty canvas.

## Risks & Assumptions

- Risk: Over‑refinement increases implementation time. Mitigation: phase visual polish behind feature flags and iterate.
- Risk: Color changes reduce recognizability. Mitigation: keep domain color mapping consistent; adjust saturation only.
- Assumption: No new runtime dependencies in v2; ADR required if introduced.

## Telemetry & KPIs

- Local only in v2 (no network). Optional: emit console counters during development.
- Success heuristics: fewer steps to first meaningful result; immediate comprehension of fit/no‑fit; stable 60fps interactions.

---

## Reference Architecture (lean)

- Style: Keep v1 layered boundaries — UI → App → Domain → Data (read‑only) with Shared utils.
- Allowed imports: UI→App; App→Domain|Data|Shared; Domain→Shared; Data→Shared; no back‑edges.
- State: App orchestrates and owns UI state; Domain remains pure and tested.
- Rendering: Continue custom SVG bars; refined composition and tokens for v2.

## Module Decomposition Plan (v2)

Target layout (unchanged at top level; refined UI structure):

```sh
src/
  app/            # orchestration, state, derived values
  domain/         # pure calculations (unchanged)
  data/           # static catalogs
  ui/             # refined components and layout
  shared/         # types, units, tokens
```

UI modules (new/refined):

- ui/Layout/TopBar.vue
  - Responsibility: Title, theme toggle, unit toggle.
  - Public API: Props: `{ state }`; Emits: none.
  - Internal: Persists theme/unit preferences.
  - Files: 1 SFC (~80–120 lines).

- ui/Bars/GpuBarRow.vue (+ Segment.vue)
  - Responsibility: Render one GPU bar; segments for weights, KV, reserve, free; tooltips and keyboard navigation.
  - Public API: Props: `{ bar }` from `app/controller.buildPerGpuBars`.
  - Internal: Tooltip positioning, label truncation rules.
  - Files: 1–2 SFCs (~200–250 lines total).

- ui/Panels/DeploymentsPanel.vue
  - Responsibility: Compact editor for deployments (model, TP, dtypes, U, GPU assignment) within the guided flow; compatible with future split layout.
  - Public API: Props: `{ state }` and callbacks to App.
  - Internal: Validation messages; disabled Apply for invalid states.
  - Files: 1 SFC (~200–300 lines).

- ui/Panels/RecommendationsPanel.vue
  - Responsibility: Show and apply `--max-model-len` / `--max-num-seqs` suggestions per deployment.
  - Public API: Props: `{ state }`; Emits: `apply({deploymentId, kind, value})`.
  - Internal: Displays raw vs safety‑adjusted values and formula hint.
  - Files: 1 SFC (~120–180 lines).

- ui/Guided/Stepper.vue (keep)
  - Responsibility: Optional guided mode for first‑time users.
  - Note: Hidden by default in split layout; accessible via a toggle.

Tokens & styles:

- src/styles/tokens.css (tune): adjust palette to muted Apple‑like hues per ADR‑0007 Palette Tokens; ensure AA contrast; keep semantic variables.
- src/styles/index.css: maintain utilities; prefer fewer borders, more spacing.

### Flow Variants (choose one)

- A) Guided + Sticky Preview (default)
  - Description: Keep the current stepper; once GPUs are selected, a results preview panel appears and remains visible while progressing through steps.
  - Pros: Low cognitive load; great for first‑time users; minimal layout change from v1; easy to implement incrementally.
  - Cons: Reduced horizontal room for bars on smaller screens; dual‑focus (stepper + preview) can split attention; preview can push key controls below the fold on short viewports; slightly trickier keyboard focus order and ARIA announcements to avoid focus traps; sticky panel needs careful performance tuning to prevent layout thrash/jank on rapid input changes; suggestions shown in preview may feel context‑ambiguous when editing a different deployment unless the preview clearly highlights the active target.

- B) Split (Canvas) Mode
  - Description: Two‑column layout with collapsible control panels on the left and always‑visible bars on the right.
  - Pros: Power‑user friendly; bars are always dominant; quick iteration.
  - Cons: Slightly more complex to get spacing and responsiveness perfect; can feel denser if not tuned.

- C) Context Drawer Preview
  - Description: Keep the stepper full‑width; show a right‑side drawer with bars that slides in after GPU selection.
  - Pros: Focused initial flow with on‑demand results; good compromise for small screens.
  - Cons: Drawer ergonomics and motion need care to preserve minimalism.

## Suggested Size & Complexity Limits

- max_file_lines: 500; max_func_lines: 70; max_cyclomatic: 10 (heuristics).

## Shared Conventions

- Layer‑first folders; UI imports App only.
- Public APIs defined in App/Domain drive UI; no cross‑module leakage.
- Consistent naming and explicit props; no single‑letter identifiers.

## Test Strategy

- Domain/app tests remain and must continue to pass (no behavior change expected for calculations).
- Add UI smoke tests (where practical) for:
  - Per‑GPU bar rendering given deterministic state.
  - Keyboard navigation across segments (Left/Right) and tooltip text exposure.
  - Apply‑suggestion updates the state and recomputes results.
- Update/remove obsolete tests in the same PR when UI contracts change.
- Keep test runtime reasonable (under a few minutes locally).

## Dependency Policy

- No new runtime dependencies without an ADR under `docs/adr/`.
- If a positioning helper becomes necessary for tooltips/popovers, draft a short ADR with alternatives and license notes before adding.

---

## Detailed Behavior Notes (v2)

- Label rules: Inline text appears when a segment width ≥10% of the bar; otherwise rely on tooltip/ARIA. Precision: 1 decimal for GiB and %.
- Tooltip content: `<model> <component>: <size GiB> (<pct>%)`.
- Safety factor: Apply 0.98 when presenting/using suggested flags; surface raw value on hover as “before safety factor”.
- Adjustable suggestions:
  - Seed the control with the suggested value; allow +/- nudging (step 1 for `max_num_seqs`, step 128 for `max_model_len`), and direct typing.
  - Disable Apply when the adjusted value would violate constraints or drop below minimums.
  - On adjustment, preview recalculates bars in real time (before Apply) using temporary UI state; main App state updates only on Apply.
- First‑run defaults: Do not preselect a GPU. After the user selects one or more GPUs, show bars with an empty deployment and a calm prompt to choose a model; hide advanced fields behind disclosure.
- Persisted prefs: Theme and unit in localStorage; default unit GiB.

---

## Glossary

- TP: Tensor Parallel degree (number of GPUs sharding model).
- KV cache: Attention key/value tensors stored per token per layer.
- Utilization share (U): Fraction of GPU memory allocated to deployments; implied reserve = `1 − Σ U_d`.

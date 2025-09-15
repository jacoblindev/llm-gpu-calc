# ADR-0009: v3 UI Shell — Viz‑First Canvas with Dual Drawers and Tile Inspector

Status: Proposed
Date: 2025-09-14

## Context

v2 adopted a guided stepper with a sticky preview (ADR‑0007). For v3, we want the visualization to be the primary surface and streamline editing via on‑demand overlays. We also switch the default visualization to Waffle small multiples and introduce an optional Synthwave Minimal theme (ADR‑0008).

## Decision

- Make the visualization the default canvas on both desktop and mobile.
- Move editors (GPUs, Deployments/Models, Workload) into a left overlay Control Dock with tabs.
- Add a right overlay Insights Drawer that surfaces per‑GPU fit status and Suggestions with one‑click Apply.
- Provide a Tile Inspector modal for detailed per‑GPU breakdown on click/Enter.
- Keep all overlays non‑reflow (true overlays) to avoid layout shift; trap focus; ESC to close.
- Default visualization is Waffle tiles (10×10; compact 20×20). No per‑deployment slices in v3; Used aggregates into weights vs KV.

## Alternatives Considered

- Keep stepper + sticky preview (v2). Lower risk but splits attention and buries results on smaller viewports.
- Split (Canvas) permanent two‑pane. Good for power users but reduces canvas real estate and increases layout complexity.
- Context drawer only (right). Simpler but still leaves editors mixed with Viz in the main column.

## Consequences

- New shell composition and components (Dock, Drawer, Inspector). Existing editors are wrapped/reused.
- Sort/filter moves into a sticky control row within Viz; KPI ribbon deep‑links to Viz (e.g., Warnings chip opens Insights and sets filter).
- Mobile uses bottom sheet for Control Dock and full‑height sheet for Insights; Inspector becomes a full‑screen modal.
- View preferences (sort, filter, density) become part of the Pinia store; a small store plugin keeps them in sync with URL/localStorage for shareable views.

## Implementation Notes

- State management: consolidate app state into a Pinia store; UI consumes via `useAppStore()`; store actions wrap controller logic. Include `viewPrefs` in the store for sort/filter/density.
- Reuse existing `GpuSelector`, `DeploymentModels`, `DeploymentWorkload`, `Legend` inside the Dock/Drawer.
- Use existing controller derivations: `computeResultsStub`, `buildPerGpuBars`, `buildPerGpuFitStatus`, and suggestion apply functions.
- Keyboard: grid navigation supports Arrow keys plus Home/End (first/last) and PageUp/PageDown (jump by visible row).
- Persist sort/filter/density to URL/localStorage; theme via `theme-synth` class and localStorage.

## Testing

- Overlay a11y: focus trap, aria‑modal, ESC, return‑focus to invoker.
- No layout shift: opening/closing overlays does not change grid geometry; CLS near zero.
- Waffle mapping: totals match N×N exactly using largest remainder; stable rounding across small input changes.

# ADR-0008: Synthwave Minimal Theme Tokens

Status: Proposed
Date: 2025-09-14

## Context

We are redesigning the UI (v3) to a Command Center dashboard with Waffle visualization and a futuristic sci‑fi aesthetic while keeping minimalism, performance, and WCAG AA contrast. The current token set targets an Apple‑style palette (ADR‑0007). We want an optional themed variant that can be toggled without changing domain/app boundaries or adding runtime dependencies.

## Decision

Introduce a theme variant class `theme-synth` that overrides CSS variables in `src/styles/tokens.css` (with a `.theme-synth.dark` complement). The theme emphasizes deep navy surfaces, neon‑cyan accents, and violet/teal visualization colors, with restrained motion and subtle glows. No new runtime dependencies.

### Token Overrides (initial)

Applied when `<html class="theme-synth">` is present:

Light (synth)

- `--color-bg`:        #0B0F17
- `--color-surface`:   #111827
- `--color-text`:      #E5E7EB
- `--color-muted`:     #94A3B8
- `--color-primary`:   #22D3EE
- `--color-success`:   #10B981
- `--color-warning`:   #F59E0B
- `--color-danger`:    #F43F5E
- `--color-weights`:   #8B5CF6
- `--color-kv`:        #22D3EE
- `--color-reserve`:   #334155
- `--color-free`:      #16A34A
- `--border-color`:    #1F2937

Dark (synth + dark)

- Same as light synth for simplicity, with optional slight lightening of text/borders for contrast.

Additional tokens

- `--ring-glow`:       rgba(34, 211, 238, 0.35)
- `--grid-dot`:        rgba(255, 255, 255, 0.04)
- `--panel-inner-stroke`: rgba(255, 255, 255, 0.06)
- `--radius-md`:       10px (reuse existing radius variable)

### Behavior

- Theme toggle: extend `TopBar` to offer a “Style” menu (Default | Synth). Toggling adds/removes `theme-synth` on `<html>`. Persist in localStorage (best‑effort).
- Motion: micro‑interactions 140–180ms; respect `prefers-reduced-motion` (disable glows/transforms).
- Accessibility: verify AA contrast (≥4.5:1) for text on primary/surface; status pills include text and not only color.

## Alternatives Considered

- Keep only Apple‑style palette (ADR‑0007). Simpler, but does not meet desired brand direction.
- Introduce a charting/UI library with built‑in “neon” themes. Rejected due to dependency policy and lack of need.
- Replace `dark` with `theme-synth` entirely. Rejected to preserve backwards compatibility and user preference for prior style.

## Consequences

- Need to update `src/styles/tokens.css` to add `.theme-synth` and `.theme-synth.dark` sections.
- Minor updates to focus styles and hover states to use `--ring-glow` and `--panel-inner-stroke`.
- `TopBar` gains a style toggle control and localStorage key (e.g., `stylePreference = 'default' | 'synth'`).
- No changes to Domain or App logic; no new runtime dependencies.

## Implementation Notes

- Place theme overrides below current root/dark blocks to ensure correct cascade.
- Background adornments (radial gradient, dot grid) should be low‑opacity and optional; wrap with a class so they can be disabled easily and respect reduced motion.
- Keep interactive unit as tiles; do not add per‑cell DOM listeners; preserve performance budgets.

## Testing

- Visual regression checks across light/dark + synth on representative pages.
- Contrast checks for primary surfaces and text using tooling (manual acceptable for v3).
- Unit test the style toggle persistence (gracefully no‑op if localStorage unavailable).

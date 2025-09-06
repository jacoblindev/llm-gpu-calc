# ADR-0003: Styling with Tailwind CSS and Tokens

Date: 2025-09-05

## Status

Accepted

## Context

The calculator needs a lightweight, consistent styling approach with good defaults, dark mode, and accessibility without heavy runtime dependencies. We also want semantic colors for domain concepts (weights, KV, reserve, unallocated, free) and predictable spacing/typography.

## Decision

- Use Tailwind CSS for utility-first styling and layout. Keep components simple and predictable.
- Define semantic design tokens as CSS variables (colors, spacing, radii, fonts) and reference them from Tailwind via `theme.extend.colors` and `:root` variables.
- Implement dark mode using Tailwind's `dark` class in conjunction with CSS variable overrides.
- Keep charts custom with SVG (no chart library) and drive fills/strokes via CSS variables.

## Alternatives Considered

- Hand-written CSS without Tailwind: viable but slower to iterate; more custom CSS to maintain.
- Other utility frameworks (e.g., UnoCSS, Windi): comparable; Tailwind chosen for ecosystem familiarity.
- Component libraries: heavier and less flexible for our specific visualization needs.

## Consequences

- Adds Tailwind as a build-time dependency and PostCSS pipeline in the SPA.
- Requires a small `tokens.css` defining CSS variables aligned with the PRD's Appendix.
- Developers should prefer semantic tokens (`var(--color-weights)`) over hardcoded palette classes in domain visuals.

## Follow-up

- Create Tailwind config with `theme.extend.colors = { weights: 'var(--color-weights)', kv: 'var(--color-kv)', ... }` and enable dark mode 'class'.
- Add a base stylesheet (`src/styles/tokens.css`) with `:root` and `.dark` variable definitions from PRD Appendix.
- Document number/unit formatting rules in a small util and ensure consistency across bars and legends.

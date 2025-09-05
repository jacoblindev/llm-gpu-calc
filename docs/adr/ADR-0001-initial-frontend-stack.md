# ADR-0001: Initial Frontend Stack and Visualization Approach

Date: 2025-09-04

## Status

Proposed

## Context

We need a lightweight, testable way to deliver an interactive vRAM calculator. The app is input-driven and CPU-light, with domain logic that should be pure and well-tested. Visualization can be a simple segmented bar per GPU; a heavy chart dependency is not strictly necessary for v1.

## Decision

- Use Vue 3 + TypeScript with Vite as the build tool for a small SPA.
- Use Pinia for simple, explicit app state management.
- Keep domain logic in pure TS modules, separate from UI concerns.
- Implement visualization with custom SVG components (no chart library in v1).
- No backend in v1; catalogs are static JSON loaded at build/runtime.

## Alternatives Considered

- React: Popular and flexible; Vue chosen per stakeholder preference for simpler templating and built-in reactivity patterns.
- Svelte/Preact: Smaller footprint; Vue chosen for ecosystem and developer familiarity.
- Next.js/Nuxt: Overkill for a single-page calculator; adds routing/server complexity.
- Chart.js/Recharts/ECharts: Useful for complex charts, but not necessary for segmented bars; adds runtime size.
- Pure HTML + TS (no framework): Possible, but Vue accelerates component reuse and state flow for the stepper.

## Consequences

- Introduces Vue 3, Pinia, and Vite as runtime/build dependencies; must be approved under dependency policy.
- Keeping custom SVG reduces bundle size; minor extra code to implement labels/legend.
- Clear layering supports unit testing and modular growth.

## Follow-up

- On approval, scaffold the project with the chosen stack.
- If a chart library becomes desirable, introduce via a separate ADR with rationale and size impact.

# ADR-0005: Per-deployment Utilization Shares with Implied Reserve

Status: Accepted

Date: 2025-09-06

## Context

The PRD v1 modeled a global GPU memory utilization `U ∈ [0,1]` and a fixed per‑GPU runtime reserve (GB). The UI needs more intuitive control over how multiple deployments share a GPU.

## Decision

- Introduce a per‑deployment utilization share `utilizationShare ∈ [0,1]` configured during model selection.
- For each GPU, compute the total share as `Σ U_d` across deployments assigned to that GPU in Step 3. The implied runtime reserve fraction is `max(0, 1 − Σ U_d)`.
- Remove global `U` and fixed `reserve GB` UI. Keep units toggle in Global Controls.
- Default `utilizationShare` = 0.90 for a single deployment; users can rebalance across multiple deployments.

## Consequences

- UI changes: Step 2 includes a `Utilization U` control per deployment; Results view shows ΣU and implied reserve per GPU.
- Domain impact: Aggregation formulas will be adjusted in Task 4.x to apply per‑deployment shares when computing budgets and free capacity (instead of global `U` and fixed reserve GB).
- Validation: Warn when `Σ U_d > 1` on any GPU; leave as soft constraint in v1.

## Alternatives Considered

- Keep global `U` + fixed reserve (simpler, less flexible). Rejected based on UX clarity across overlapping deployments.
- Per‑GPU manual reserve entry (more controls, more complexity). Rejected for v1.

## Traceability

- PRD: UI/UX refinement request during Task 3.0
- ARCH-v1: Data/UI boundaries unchanged; `Deployment` type extended with optional `utilizationShare`.

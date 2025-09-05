# Architecture Overview (v1)

Primary drivers: simple, fast, and predictable per‑GPU vRAM estimation for vLLM inference, with clear module boundaries that keep calculations pure and testable.

## Modules and Boundaries

- ui/: Vue components; presentational only. Imports from app/ only.
- app/: State and orchestration. Imports domain/, data/, shared/.
- domain/: Pure TypeScript functions for memory estimates. Imports shared/ only.
- data/: Read‑only catalogs for GPUs and models. Imports shared/ only.
- shared/: Types, constants, and units utilities. No external deps.

Allowed imports: UI→App; App→Domain|Data|Shared; Domain→Shared; Data→Shared. No back‑edges.

## Key Contracts

- Types (shared/types.ts)
  - `Gpu { id: string; name: string; vramGB: number }`
  - `Model { id: string; name: string; paramsB: number; layers: number; hiddenSize: number; heads: number; defaultDtype: 'fp16'|'bf16' }`
  - `DType = 'fp16'|'bf16'|'fp32'|'q8'|'q4'`

- Domain (domain/memory.ts)
  - `bytesPerParam(dtype: DType): number`
  - `weightBytes(paramsB: number, dtype: DType, tp: number): number`
  - `kvBytesPerTokenPerGpu(hidden: number, layers: number, elemBytes: number, tp: number, overheadPct: number): number`
  - `budgetBytesPerGpu(capacityBytes: number, utilization: number): number`
  - `kvTotalBytesPerGpu(tokensTotal: number, perTokBytesPerGpu: number): number`
  - `estimatePerGpu(capacityBytes: number, utilization: number, weights: number, kv: number): { used: number; free: number; parts: {...} }`
  - `suggestMaxModelLen(budgetBytes: number, kvPerTokenPerGpu: number, numSeq: number): number`
  - `suggestMaxNumSeq(budgetBytes: number, kvPerTokenPerGpu: number, modelLen: number): number`

- Data (data/catalog.ts)
  - `listGpus(): Gpu[]`
  - `listModels(): Model[]`
  - `getModelById(id: string): Model | undefined`

## Data Flow

UI (forms/stepper) → App (state + validation) → Domain (pure estimates) → App (compose results) → UI (bars)

State lives in App. Domain is stateless. Data is static JSON read at startup.

## Non‑Functionals

- Performance: Domain calculations complete in < 5 ms for typical inputs.
- Reliability: Guard against invalid inputs; display validation errors in UI.
- Testability: Unit tests in domain cover formulas and edge cases; light UI smoke tests.
- Accessibility: Bars have ARIA roles and text equivalents.

## Tech Choices (see ADR‑0001)

- Vue 3 + Vite + TypeScript + Pinia for a simple SPA.
- No chart library initially; SVG bars implemented in UI.
- No backend in v1.

## Risks & Mitigations

- Approximation fidelity: Document formulas; provide adjustable headroom and overhead factors.
- Catalog accuracy: Keep catalogs versioned; allow easy updates.
- Scope creep into runtime profiling: Defer to future ADRs; keep v1 static and deterministic.

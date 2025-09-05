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
  - `Gpu { id: string; name: string; vramBytes: number }`
  - `UnitPreference = 'GiB'|'GB'`
  - `Model { id: string; name: string; paramsB: number; layers: number; hiddenSize: number; heads: number; numKeyValueHeads: number; defaultWeightDtype: DType; defaultKvDtype: KvDType }`
  - `DType = 'fp16'|'bf16'|'fp32'|'q8'|'q4'`
  - `KvDType = 'fp16'|'bf16'|'fp8'|'int8'`
  - `Deployment { id: string; modelId: string; assignedGpuIds: string[]; tp: number; weightDtype: DType; kvDtype: KvDType; kvOverheadPct: number; replicationOverheadPct: number; maxModelLen: number; maxNumSeqs: number }`

- Domain (domain/memory.ts)
  - `bytesPerParam(dtype: DType): number`
  - `bytesPerKvElem(dtype: KvDType): number`
  - `weightBytesPerGpu(paramsB: number, dtype: DType, tp: number, replicationOverheadPct: number): number`
  - `kvBytesPerTokenPerGpu(layers: number, hidden: number, heads: number, numKvHeads: number, kvDtype: KvDType, tp: number, kvOverheadPct: number): number`
  - `budgetBytesPerGpu(capacityBytes: number, utilization: number, reserveBytes: number): number`
  - `kvTotalBytesPerGpu(tokensTotal: number, perTokBytesPerGpu: number): number`
  - `aggregatePerGpu(deployments: Deployment[], gpus: Gpu[], models: Record<string, Model>, utilization: number, reserveBytes: number): Map<string, { used: number; free: number; parts: Array<{deploymentId: string; weights: number; kv: number}> }>`
  - `suggestMaxModelLen(budgetBytes: number, kvPerTokenPerGpu: number, numSeq: number): number`
  - `suggestMaxNumSeq(budgetBytes: number, kvPerTokenPerGpu: number, modelLen: number): number`
  - `fitChecks(perGpu: Map<string, ...>): Array<{gpuId: string; ok: boolean; reason?: string}>`

- Data (data/catalog.ts)
  - `listGpus(): Gpu[]`
  - `listModels(): Model[]`
  - `getModelById(id: string): Model | undefined`

- Shared utils (shared/units.ts)
  - `bytesToGiB(bytes: number): number`
  - `bytesToGB(bytes: number): number`
  - `formatBytes(bytes: number, unit: UnitPreference, decimals = 1): string`
  - All domain calculations use bytes; formatting happens in UI/App using these helpers.

## Data Flow

UI (forms/stepper & deployment roster) → App (state + validation) → Domain (pure estimates, per‑GPU aggregation) → App (compose results) → UI (bars)

State lives in App. Domain is stateless. Data is static JSON read at startup.

## Non‑Functionals

- Performance: Domain calculations complete in < 5 ms for typical inputs.
- Reliability: Guard against invalid inputs; display validation errors in UI.
- Testability: Unit tests in domain cover formulas and edge cases; light UI smoke tests.
- Accessibility: Bars have ARIA roles and text equivalents.

## Tech Choices (see ADR‑0001, ADR‑0003)

- Vue 3 + Vite + TypeScript + Pinia for a simple SPA.
- Tailwind CSS for utilities and layout; semantic colors via CSS variables (Appendix in PRD) configured in Tailwind.
- No chart library initially; SVG bars implemented in UI.
- No backend in v1.

## Risks & Mitigations

- Approximation fidelity: Document formulas (ADR‑0002); provide adjustable headroom and overhead factors.
- Catalog accuracy: Keep catalogs versioned; allow easy updates.
- Scope creep into runtime profiling: Defer to future ADRs; keep v1 static and deterministic.

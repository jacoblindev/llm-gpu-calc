# Architecture Overview (v1)

Primary drivers: simple, fast, and predictable per-GPU vRAM estimation for vLLM inference, with clear module boundaries that keep calculations pure and testable.

## Modules and Boundaries

- ui/: Vue components; presentational only. Imports from app/ only.
- app/: State and orchestration. Imports domain/, data/, shared/.
- domain/: Pure TypeScript functions for memory estimates. Imports shared/ only.
- data/: Read-only catalogs for GPUs and models. Imports shared/ only.
- shared/: Types, constants, and units utilities. No external deps.

Allowed imports: UI→App|Shared; App→Domain|Data|Shared; Domain→Shared; Data→Shared. No back‑edges.

## Key Contracts

- Types (`src/shared/types.ts`)
  - `Gpu { id: string; name: string; vramBytes: number }`
  - `UnitPreference = 'GiB'|'GB'`
  - `Model { id: string; name: string; paramsB: number; layers: number; hiddenSize: number; heads: number; numKeyValueHeads: number; defaultWeightDtype: DType; defaultKvDtype: KvDType }`
  - `DType = 'fp16'|'bf16'|'fp32'|'q8'|'q4'`
  - `KvDType = 'fp16'|'bf16'|'fp8'|'int8'`
  - `Deployment { id: string; modelId: string; assignedGpuIds: string[]; tp: number; weightDtype: DType; kvDtype: KvDType; kvOverheadPct: number; replicationOverheadPct: number; maxModelLen: number; maxNumSeqs: number; utilizationShare?: number }`

- Domain (`src/domain/memory.ts`)
  - `bytesPerParam(dtype: DType): number`
  - `bytesPerKvElem(dtype: KvDType): number`
  - `weightBytesPerGpu(paramsB: number, dtype: DType, tp: number, replicationOverheadPct: number): number`
  - `kvBytesPerTokenPerGpu(layers: number, hidden: number, heads: number, numKeyValueHeads: number, kvDtype: KvDType, tp: number, kvOverheadPct: number): number`
  - `budgetBytesPerGpu(capacityBytes: number, utilization: number, reserveBytes: number): number`
  - `kvTotalBytesPerGpu(tokensTotal: number, perTokBytesPerGpu: number): number`
  - `aggregatePerGpu(deployments: Deployment[], gpus: Gpu[], models: Record<string, Model>, utilization: number, reserveBytes: number): Map<string, { used: number; free: number; parts: Array<{deploymentId: string; weights: number; kv: number}> }>`
  - `suggestMaxModelLen(budgetBytes: number, kvPerTokenPerGpu: number, numSeq: number): number`
  - `suggestMaxNumSeq(budgetBytes: number, kvPerTokenPerGpu: number, modelLen: number): number`
  - `fitChecks(perGpu: Map<string, ...>): Array<{gpuId: string; ok: boolean; reason?: string}>`

- Data (`src/data/catalog.ts`)
  - `listGpus(): Gpu[]`
  - `listModels(): Model[]`
  - `getModelById(id: string): Model | undefined`
  - JSON schema:
    - GPUs (`src/data/gpus.json`): `{ id: string, name: string, vendor?: string, vramBytes: number }`
    - Models (`src/data/models.json`): `{ id: string, name: string, paramsB: number, layers: number, hiddenSize: number, heads: number, numKeyValueHeads: number, defaultWeightDtype: DType, defaultKvDtype: KvDType }`
  - Seed entries: as listed in PRD “Initial Catalog (v1)”. Ambiguous capacities are added as placeholders pending confirmation.

- Shared utils (`src/shared/units.ts`)
  - `bytesToGiB(bytes: number): number`
  - `bytesToGB(bytes: number): number`
  - `formatBytes(bytes: number, unit: UnitPreference, decimals = 1): string`
  - All domain calculations use bytes; formatting happens in UI/App using these helpers.

## Data Flow

UI (stepper: GPUs → Models (with U share) → Workload → Results) → App (state + validation + derived ΣU/reserve) → Domain (pure estimates, per‑GPU aggregation) → App (compose results) → UI (bars)

State lives in App. Domain is stateless. Data is static JSON read at startup.

## Non‑Functionals

- Performance: Domain calculations complete in < 5 ms for typical inputs.
- Reliability: Guard against invalid inputs; display validation errors in UI.
- Testability: Unit tests in domain cover formulas and edge cases; light UI smoke tests.
- Accessibility: Bars have ARIA roles and text equivalents.

## Build & Release (CI/CD)

- CI (Validation): GitHub Actions workflow `ci.yml` runs on pull requests and pushes to `main`.
  - Environment: Node 20.x.
  - Steps: checkout, setup-node with npm cache, `npm ci`, `npm run typecheck`, `npm test`.
  - Boundaries: purely dev tooling; no runtime deps added.

- CD (Deployment to Pages): GitHub Actions workflow `deploy-pages.yml` runs on pushes to `main`.
  - Steps: checkout, setup-node, `npm ci`, `npm run build`, `actions/upload-pages-artifact` (from `dist/`), `actions/deploy-pages` to the `github-pages` environment.
  - Permissions: `pages: write`, `id-token: write`.
  - Concurrency: group by workflow to serialize deployments.
  - Vite base path: Configure Vite `base` for GitHub Pages project pages (`'/${repo}/'`) or keep `'/'` if using a user/organization site; document choice in README.

- Repository settings:
  - Pages: Source = GitHub Actions; Environment = `github-pages`.
  - Branch protection (recommended): require CI checks on `main`.

### Versioning (v1)

- App version: SemVer `MAJOR.MINOR.PATCH`.
- Source of truth: `package.json#version`; bump with `npm version {patch|minor|major}`.
- Tags: Create Git tag `vX.Y.Z` for each release; use tags for traceability. Pages continues to deploy on `main`.
- Branching: Trunk‑based on `main` with short‑lived feature branches merged via PR. A `develop` branch is optional; if it exists, merge `main` back into `develop` after releases to keep versions aligned.
- Manual UI flow (supported):
  - Bump `package.json#version` via a PR in the GitHub UI → merge to `main` (CI validates).
  - Draft a Release in the GitHub UI and create tag `vX.Y.Z` targeting the merge commit on `main`.
  - Pages deploy runs automatically on `main`.
- Stamping (optional): Expose `VITE_APP_VERSION` and `VITE_APP_COMMIT` via Vite/env and display in a small footer/About. No backend.
- Catalog changes: Data additions/edits are PATCH; schema additions MINOR; breaking schema changes MAJOR.
- See ADR-0006 for details.

## Tech Choices (see ADR‑0001, ADR‑0003)

- Vue 3 + Vite + TypeScript + Pinia for a simple SPA.
- Tailwind CSS for utilities and layout; semantic colors via CSS variables (Appendix in PRD) configured in Tailwind.
- No chart library initially; SVG bars implemented in UI.
- No backend in v1.

## Risks & Mitigations

- Approximation fidelity: Document formulas (ADR‑0002); provide adjustable headroom and overhead factors.
- Catalog accuracy: Keep catalogs versioned; allow easy updates.
- Scope creep into runtime profiling: Defer to future ADRs; keep v1 static and deterministic.

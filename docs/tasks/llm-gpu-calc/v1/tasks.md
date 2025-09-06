# Tasks: LLM GPU vRAM Calculator (v1)

## Snapshot

- Repo: simple docs + rules; no app code yet.
- Stack: Vue 3 + Pinia + TS + Vite (ADR-0001) + Tailwind CSS (ADR-0003).
- Test command (planned): `pnpm test` or `npm test` once scaffolded; domain unit tests first.
- Notable risks: estimation fidelity; catalog accuracy; dependency approvals.

## Parent Tasks

- [x] 0.0 Establish architecture scaffolding
  - [x] 0.1 Create directory layout & stubs from PRD Module Plan (ui/app/domain/data/shared)
    - Acceptance: Folders created; minimal index files exporting public types/APIs; build passes with empty stubs.
    - Gates: Boundaries respected per ARCH-v1; no runtime deps added.
    - Traceability: PRD Module Decomposition; ARCH Key Contracts.
    - Est: 1–2h
  - [x] 0.2 Align code with ARCH-v1 boundaries; add/update ADR if deviating
    - Acceptance: eslint/tsconfig path aliases (if used) align with allowed imports; any deviation documented via ADR.
    - Gates: Boundaries; Dependency ADRs if introduced.
    - Traceability: ARCH Modules and Boundaries.
    - Est: 1h
  - [x] 0.3 Agree dependency rule (ADR required for new runtime deps)
    - Acceptance: Dependency policy acknowledged in repo docs; ADR process noted.
    - Gates: Dependency.
    - Traceability: PRD Dependency Policy; ADR-0001/0003.
    - Est: 0.5h
  - [x] 0.4 Add Tailwind CSS, base `tokens.css`, and Tailwind config mapping to PRD tokens (ADR-0003)
    - Acceptance: Tailwind configured; `tokens.css` defines :root/.dark variables; sample component renders with tokens.
    - Gates: Dependency ADR already accepted; Boundaries unaffected.
    - Traceability: PRD UI Tokens; ADR-0003.
    - Est: 1–2h

- [x] 1.0 Domain: vRAM estimation engine
  - [x] 1.1 GQA-aware KV per-token formula; decouple weight vs KV dtypes
    - Acceptance: `kvBytesPerTokenPerGpu(...)` implemented per ARCH; unit tests cover a few models/head configs and kv dtypes (fp16/fp8/int8).
    - Gates: Tests; Boundaries (domain→shared only).
    - Traceability: PRD Estimation Formulas; ARCH Domain contracts.
    - Est: 2–3h
  - [x] 1.2 Replication overhead for weights; configurable
    - Acceptance: `weightBytesPerGpu(...)` includes `replicationOverheadPct` (default 2%); unit tests verify scaling across tp and overhead values.
    - Gates: Tests; Boundaries.
    - Traceability: PRD Detailed Inputs; ADR-0002.
    - Est: 1–2h
  - [x] 1.3 Per-GPU aggregator supporting overlapping deployments
    - Acceptance: `aggregatePerGpu(...)` sums weights/KV across deployments for shared GPUs; returns used/free and per-deployment parts; unit tests include overlap and edge cases.
    - Gates: Tests; Boundaries.
    - Traceability: PRD Multi-GPU Behavior; ARCH Data Flow.
    - Est: 2–3h
  - [x] 1.4 Suggestions: `--max-model-len` / `--max-num-seqs`
    - Acceptance: `suggestMaxModelLen` and `suggestMaxNumSeq` return integers and respect budgets; unit tests cover representative budgets.
    - Gates: Tests.
    - Traceability: PRD Recommendations.
    - Est: 1–2h
  - [x] 1.5 Validation and fit checks (warnings/errors)
    - Acceptance: Functions compute fit status and reasons per GPU; warnings for `U>0.95`; minimal KV viability checks per deployment; unit tests cover fail/warn paths.
    - Gates: Tests; Boundaries.
    - Traceability: PRD GPU Memory Utilization & Safeties.
    - Est: 2h

- [x] 2.0 Data catalogs: GPUs and Models (JSON + typed access)
  - [x] 2.1 Add `numKeyValueHeads` to models; verify a few real entries
    - Acceptance: `models.json` schema includes `numKeyValueHeads`; sample entries populated (e.g., Llama-3.1-8B, Gemma-3-27B, Phi-4) with reasonable values.
    - Gates: Boundaries; Tests (basic data load/shape checks).
    - Traceability: PRD Initial Catalog; ARCH Data schema.
    - Est: 1–2h
  - [x] 2.2 Seed `src/data/models.json` and `src/data/gpus.json` with the initial lists from PRD (capacities confirmed)
    - Acceptance: All listed models/GPUs present with consistent ids/names; GPU capacities stored as `vramBytes`; simple loader returns typed arrays.
    - Gates: Boundaries.
    - Traceability: PRD Initial Catalog; ARCH Data schema.
    - Est: 1–2h
  - [x] 2.3 Include both A100 variants (80GB/40GB), RTX 6000 Ada 48GB, RTX A6000 48GB, RTX Pro 6000 Blackwell 96GB, RTX 5090 32GB, H200 141GB
    - Acceptance: Variants appear distinctly and selectable; docs note variant differences.
    - Gates: Boundaries.
    - Traceability: PRD Initial Catalog.
    - Est: 0.5–1h

- [x] 3.0 UI/App: Deployment roster + Stepper
  - [x] 3.1 Create deployments, assign GPUs, set TP, dtypes, overheads
    - Acceptance: Users can add/edit/remove deployments; assign GPUs; set TP, weight/kv dtypes, overheads, `max_model_len`, `max_num_seqs`.
    - Gates: Boundaries; No new runtime deps.
    - Traceability: PRD User Stories; PRD Acceptance Criteria (Deployment).
    - Est: 2–4h
  - [x] 3.2 Utilization shares and implied reserve
    - Acceptance: Each deployment has a `U` share [0..1] set during model selection; Results show per‑GPU ΣU and implied reserve `1−ΣU`. See ADR‑0005.
    - Gates: Boundaries.
    - Traceability: PRD Detailed Inputs; ADR‑0005.
    - Est: 1–2h
  - [x] 3.3 Validation: tp ≤ assigned GPUs; soft warnings for mixed capacities
    - Acceptance: Hard validation blocks TP > assigned; soft warning banner for mixed capacities; states are testable.
    - Gates: Boundaries.
    - Traceability: PRD Multi-GPU Behavior.
    - Est: 1–2h
  - [x] 3.4 Units toggle (GiB|GB) with localStorage persistence; results reflect unit
    - Acceptance: Toggle persists; re-renders values; capacity displays in selected unit in Results; bars/legend will follow in 4.0.
    - Gates: Boundaries.
    - Traceability: PRD Acceptance Criteria (Units toggle); UI Styles; ARCH shared units.
    - Est: 1–2h

- [ ] 4.0 Visualization: Per-GPU stacked bars
  - [ ] 4.1 Segments per deployment (weights/KV) + implied reserve/free
    - Acceptance: Bars reflect per‑GPU aggregator output; segment colors match tokens; small segments collapse labels and show values on hover.
    - Gates: Boundaries; Accessibility basics.
    - Traceability: PRD Visualization; UI Tokens.
    - Est: 2–3h
  - [ ] 4.2 Legend and bar labels with selected unit (GiB/GB) and %
    - Acceptance: Legend entries map to segments; labels formatted with 1 decimal and selected unit; percent displayed.
    - Gates: Boundaries; Formatting consistency.
    - Traceability: PRD UI Styles (number formatting).
    - Est: 1–2h
  - [ ] 4.3 Apply Tailwind utilities and tokens for consistent styling; dark mode variant
    - Acceptance: Components use Tailwind with semantic token classes/vars; dark mode supported via `.dark`.
    - Gates: Dependency (already configured); Accessibility contrast.
    - Traceability: ADR‑0003; PRD UI Tokens.
    - Est: 1–2h
  - [ ] 4.4 Re-render bars/legend on unit change; tooltips/aria-labels show precise values
    - Acceptance: Unit toggle triggers re-render; aria-label summarizes segments; tooltip shows exact bytes + formatted values.
    - Gates: Accessibility; Boundaries.
    - Traceability: PRD UI Styles; ARCH Shared utils.
    - Est: 1–2h

- [ ] 5.0 Results & Recommendations
  - [ ] 5.1 Fit/over-capacity status per GPU with reasons
    - Acceptance: GPU cards show OK/Over with reasons (weights over budget, minimal KV unmet, etc.); state is testable.
    - Gates: Boundaries; Tests (unit or component-level where feasible).
    - Traceability: PRD Acceptance Criteria (Warnings/Errors).
    - Est: 1–2h
  - [ ] 5.2 Suggestions per deployment (`--max-model-len` / `--max-num-seqs`)
    - Acceptance: Per-deployment suggestion chips display computed values; “Apply” updates inputs; formatting matches unit toggle.
    - Gates: Boundaries.
    - Traceability: PRD Recommendations.
    - Est: 1–2h

- [ ] X.0 Align & prune tests
  - [ ] X.1 Retire tests mismatching updated requirements (same PR)
  - [ ] X.2 Add/adjust tests for new public behavior only
  - [ ] X.3 Keep test runtime within agreed budget

## Notes

- Traceability: See PRD `docs/prd/llm-gpu-calc/v1/prd.md` and ARCH `docs/architecture/ARCH-v1.md`.
- Gates: Each sub-task observes Tests, Boundaries, and Dependency rules per `/rules/process-task-list.md`.
- Estimates: Each sub-task targets 1–4h to complete.

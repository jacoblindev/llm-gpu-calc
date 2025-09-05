# Tasks: LLM GPU vRAM Calculator (v1)

## Snapshot

- Repo: simple docs + rules; no app code yet.
- Stack (proposed): Vue 3 + Pinia + TS + Vite (ADR-0001).
- Test command (planned): `pnpm test` or `npm test` once scaffolded; domain unit tests first.
- Notable risks: estimation fidelity; catalog accuracy; dependency approvals.

## Parent Tasks

- [ ] 0.0 Establish architecture scaffolding
  - [ ] 0.1 Create directory layout & stubs from PRD Module Plan (ui/app/domain/data/shared)
  - [ ] 0.2 Align code with ARCH-v1 boundaries; add/update ADR if deviating
  - [ ] 0.3 Agree dependency rule (ADR required for new runtime deps)

- [ ] 1.0 Domain: vRAM estimation engine
  - [ ] 1.1 GQA-aware KV per-token formula; decouple weight vs KV dtypes
  - [ ] 1.2 Replication overhead for weights; configurable
  - [ ] 1.3 Per-GPU aggregator supporting overlapping deployments
  - [ ] 1.4 Suggestions: `--max-model-len` / `--max-num-seqs`
  - [ ] 1.5 Validation and fit checks (warnings/errors)

- [ ] 2.0 Data catalogs: GPUs and Models (JSON + typed access)
  - [ ] 2.1 Add `numKeyValueHeads` to models; verify a few real entries

- [ ] 3.0 UI/App: Deployment roster + Stepper
  - [ ] 3.1 Create deployments, assign GPUs, set TP, dtypes, overheads
  - [ ] 3.2 Global config: utilization U [0..1], runtime reserve (GB)
  - [ ] 3.3 Validation: tp ≤ assigned GPUs; soft warnings for mixed capacities

- [ ] 4.0 Visualization: Per-GPU stacked bars
  - [ ] 4.1 Segments per deployment (weights/KV) + reserve/unallocated/free
  - [ ] 4.2 Legend and bar labels with GB and %

- [ ] 5.0 Results & Recommendations
  - [ ] 5.1 Fit/over-capacity status per GPU with reasons
  - [ ] 5.2 Suggestions per deployment (`--max-model-len` / `--max-num-seqs`)

- [ ] X.0 Align & prune tests
  - [ ] X.1 Retire tests mismatching updated requirements (same PR)
  - [ ] X.2 Add/adjust tests for new public behavior only
  - [ ] X.3 Keep test runtime within agreed budget

## Notes

- Traceability: See PRD `docs/prd/llm-gpu-calc/v1/prd.md` and ARCH `docs/architecture/ARCH-v1.md`.
- Sub-tasks will be expanded after parent approval, 1–4h each, with explicit acceptance criteria per `/rules/process-task-list.md`.

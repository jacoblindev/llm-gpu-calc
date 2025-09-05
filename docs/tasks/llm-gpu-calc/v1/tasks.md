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
- [ ] 2.0 Data catalogs: GPUs and Models (JSON + typed access)
- [ ] 3.0 UI: GPU and Model selection steps (Stepper UX)
- [ ] 4.0 UI: Per-GPU segmented bar visualization
- [ ] 5.0 Config inputs: TP degree, headroom, KV options (+ validation)
- [ ] 6.0 Results: Fit/over-capacity logic, warnings, and summaries
 - [ ] 7.0 Recommendations: compute suggested `--max-model-len` / `--max-num-seq` from memory budget

- [ ] X.0 Align & prune tests
  - [ ] X.1 Retire tests mismatching updated requirements (same PR)
  - [ ] X.2 Add/adjust tests for new public behavior only
  - [ ] X.3 Keep test runtime within agreed budget

## Notes

- Traceability: See PRD `docs/prd/llm-gpu-calc/v1/prd.md` and ARCH `docs/architecture/ARCH-v1.md`.
- Sub-tasks will be expanded after parent approval, 1–4h each, with explicit acceptance criteria per `/rules/process-task-list.md`.

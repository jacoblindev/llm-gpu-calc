# PRD: LLM GPU vRAM Calculator (v1)

Slug: llm-gpu-calc (proposed)

---

## Clarifying Decisions (v1 locked)

1) Users: ML engineers/devops sizing locally hosted vLLM on one or more GPUs.
2) Scope: Frontend-only calculator; no backend or live vLLM integration.
3) Precision: Distinguish weight dtype vs KV cache dtype. Support fp16/bf16 (2B), and fp8/int8 (1B) for KV. Weights default fp16/bf16; weight quant (q8/q4) optional later.
4) Workload inputs: Model length is modeled via `max_model_len` and `max_num_seqs` (concurrency). No separate input/output tokens in v1.
5) Multi‑GPU & sharing: Tensor parallel (TP) sharding per deployment. Multiple deployments can share the same GPU(s); usages add up per GPU.
6) GPU memory utilization: Global per‑GPU utilization `U ∈ [0,1]`, default 0.90, plus a fixed runtime reserve GB per GPU to avoid OOM.
7) Visualization: Custom lightweight SVG segmented bars; no third‑party chart libs in v1.
8) Platform: Web app (Vue 3 + TS + Vite); state via Pinia.

---

## Context

Sizing vLLM deployments is tricky: vRAM usage depends on model weights, tensor parallelism, dtype/quantization, KV cache growth with sequence lengths and concurrency, and reserved overhead. A visual calculator helps engineers quickly assess whether a chosen GPU set can host a model and workload, and how memory breaks down per GPU.

## Goals

- Provide an interactive calculator to estimate per‑GPU vRAM usage for local vLLM inference.
- Allow multiple deployments (models) that can share one or more GPUs; each deployment may use TP across its assigned GPUs.
- Support selecting GPUs from a predefined catalog and models with metadata (params, layers, hidden size, heads, numKeyValueHeads, default dtypes).
- Accept workload/config inputs affecting KV cache (max_model_len, max_num_seqs), per‑deployment dtypes and overheads, global GPU memory utilization, and per‑GPU runtime reserve.
- Visualize, per GPU, the breakdown aggregated across deployments: weights, KV cache, reserved/runtime headroom, and remaining free capacity.

## Non‑Goals

- No live deployment, autoscaling, or performance measurement in v1.
- No training/finetuning memory modeling (optimizer/gradients out of scope).
- No loader‑specific nuances (e.g., tensor parallel replication anomalies) beyond simple approximations.
- No model download/quantization flows; quantized weights are a future enhancement.

## User Stories

- As an ML platform engineer, I deploy a 70B model on 2×H100 with TP=2 and, on the same GPUs, add two small models (each TP=1) to see aggregate vRAM usage and fit.
- As a dev, I adjust `utilization U` from 0.90 to 0.95 and set a 2 GB runtime reserve to review OOM risk vs. capacity.
- As a PM, I compare L40S vs H100 capacities to understand feasibility for a target `max_model_len` and `max_num_seqs`.

## Acceptance Criteria

- GPU selection allows one or more GPUs from a predefined list (e.g., H100 80GB, L40S 48GB); shows capacity per GPU.
- A “Deployment” represents a model instance with its own TP degree and settings: `{ modelId, assignedGpuIds[], tp, weightDtype, kvDtype, kvOverheadPct, replicationOverheadPct, max_model_len, max_num_seqs }`.
- Multiple deployments can share GPUs; per‑GPU totals are the sum of all deployments mapped to that GPU.
- Global inputs: GPU memory utilization `U ∈ [0,1]` (default 0.90), runtime reserve per GPU (GB), validation warnings when `U > 0.95`.
- The calculator computes per‑GPU memory breakdown and fit (OK/Over capacity) using formulas below, including GQA‑aware KV sizing and replication overhead for weights.
- Visualization renders one bar per GPU, segmented by deployment and by component (weights, KV, reserve, unallocated (1−U), free); labels show GB and %.
- Units toggle: Default GiB; user can switch to GB. Bars and labels follow the selected unit. Capacity lines/labels show both (e.g., “80 GB (74.5 GiB)”). All internal math remains in bytes.
- Warnings/Errors:
  - Warn if `U > 0.95` about increased OOM risk.
  - Error if summed per‑GPU weights `ΣW` exceed budget `B = U × capacity − reserve`.
  - Error if minimal KV viability is not met for any deployment (at least 1 token per sequence): `B − ΣW < Σ(K_tok_gpu × 1 × max(1, max_num_seqs))` for that GPU.
- TP constraints: For a deployment, require `tp ≤ assignedGpuIds.length`; recommend identical GPU types/capacities within the deployment’s TP group (soft warning only in v1).
- Recommendations: For each deployment, show suggested `--max-model-len` (given `max_num_seqs`) and `--max-num-seqs` (given `max_model_len`) with an “Apply” action.
- All domain calculations covered by unit tests; UI behavior smoke‑tested.

## UX Notes

- Stepper layout: 1) Select GPU(s) → 2) Select Model → 3) Configure Workload → 4) Results.
- Results view: grid of GPU bars with a legend and a summary (fit status, min/max free GB across GPUs).
- Accessibility: keyboard navigable, sufficient contrast, ARIA labels for segmented bars.

## UI/UX Styles (v1)

- Framework: Tailwind CSS utilities with a thin layer of CSS variables for theme tokens. See Appendix for tokens.
- Color semantics:
  - Weights: blue (primary)
  - KV cache: amber (attention)
  - Reserve: zinc/neutral (medium)
  - Unallocated (1−U): zinc/neutral (light)
  - Free: emerald/green (success)
- Typography: System UI stack, base size 14–16px; use monospace for numeric labels within bars.
- Number formatting: Show values with 1 decimal and percentages with ≤1 decimal; units follow the toggle (GiB default). Capacity labels show both units.
- Interaction: Hover highlights a deployment’s segments; clicking a bar focuses that GPU and lists contributing deployments. Provide visible focus rings for keyboard users.
- Dark mode: Token-driven (CSS variables) with Tailwind’s dark class; maintain WCAG AA contrast.
- Accessibility: Bars have role=img with aria-label summarizing segments; legend is keyboard-focusable and toggles highlighting.

## Risks & Assumptions

- Approximation risk: Real vLLM memory differs due to fragmentation, loaders, and replication nuances. Mitigate via adjustable utilization (U), KV overhead %, and clear disclaimers.
- Catalog freshness: GPU/model metadata can drift. Mitigate with a simple JSON catalog and easy updates.
- Complexity creep: Keep formulas simple and document assumptions; consider advanced modes in v2.

## Telemetry & KPIs

- Local only in v1 (no PII, no network analytics). Optional anonymous usage can be considered later via ADR.
- Success metrics: Time‑to‑answer (few steps), clarity (users can tell fit/no‑fit), and correctness (unit tests around known examples).

---

## Reference Architecture (lean)

- Style: Layer‑first with clear boundaries: UI → App → Domain → Data (read‑only).
- Allowed imports: UI→App; App→Domain|Data|Shared; Domain→Shared; Data→Shared; no back‑edges.
- State: App owns UI state and orchestrates domain calculations; Domain is pure/predictable.
- Rendering: UI uses lightweight SVG for bars; no chart dependency initially.

## Module Decomposition Plan

Target layout:

```sh
src/
  app/            # orchestration, state, adapters for UI
  domain/         # pure calc funcs for memory estimates
  data/           # static catalogs (gpus.json, models.json)
  ui/             # Vue components (steps, bars, forms)
  shared/         # types, units, utilities (e.g., bytes↔GB)
```

Modules

- domain/memory.ts
  - Responsibility: Estimate weights, KV cache, reserved, per‑GPU usage.
  - Public API: `estimateWeights(params, dtype, tp)`, `estimateKV(tokens, hidden, layers, bytes, tp, overheadPct)`, `estimatePerGpu(...)`.
  - Internal: Constants for bytes per dtype; guards; rounding.
  - Files: 1–2 TS files, ~200–300 lines total.

- data/catalog.ts (+ JSON files)
  - Responsibility: Provide typed access to GPU and model catalogs.
  - Public API: `listGpus()`, `listModels()`, `getModelById()`.
  - Internal: JSON sources `gpus.json`, `models.json`; validation.
  - Files: 1 TS + 2 JSON.

- app/state.ts / app/controller.ts
  - Responsibility: Drive stepper state, map UI inputs to domain calls.
  - Public API: Minimal hooks or functions invoked by UI.
  - Internal: Derived values, validation messages.
  - Files: 2–3 TS files.

- ui/*
  - Responsibility: Presentational components and forms for steps and bars.
  - Public API: Components; accept props only; no cross‑module imports beyond `app/`.
  - Files: ~5–8 TSX files.

- shared/*
  - Responsibility: Types and formatting utilities; read‑only.

## Suggested Size & Complexity Limits

- max_file_lines: 500; max_func_lines: 70; max_cyclomatic: 10 (heuristics only).

## Shared Conventions

- Layer‑first folders; cross‑module access only via public APIs documented above.
- Consistent naming; no single‑letter identifiers; pure domain functions.

## Test Strategy

- Unit tests for `domain/memory.ts` covering:
  - Weight memory: params × bytes_per_param ÷ TP.
  - KV cache memory per token: 2 × hidden_size × bytes × layers; total = per_token × tokens × (1/TP) × (1+overhead).
  - Per‑GPU totals and clamping; headroom application.
- UI smoke tests for stepper flow and bar rendering with deterministic inputs.
- Update or remove obsolete tests in the same PR as requirements change.

## Dependency Policy

- New runtime deps require a short ADR and approval under `docs/adr/`.
- v1 proposes Vue 3 + Pinia + Vite (see ADR‑0001). Chart libraries are deferred; revisit via ADR if needed.

---

## Detailed Inputs and Behavior

### Workload Inputs (detailed)

- max_model_len: Maximum tokens per sequence the model can hold (context + generated) for sizing memory.
- max_num_seqs: Maximum concurrent active sequences (effective batch) per deployment.
- DTypes: Separate weight dtype and KV cache dtype.
  - Weight dtype: bf16/fp16 (2B), fp32 (4B), q8≈1B, q4≈0.5B (weights quant optional in v1).
  - KV cache dtype: bf16/fp16 (2B), fp8/int8 (1B).
- KV overhead %: Accounts for allocator/paging/metadata overhead in KV cache (default 10%).
- Replication overhead %: Inflates per‑GPU weight bytes to account for unsharded/replicated params and buffers (default 2%).
- GPU memory utilization `U` (0..1): Fraction of each GPU’s capacity available to workloads (weights + KV). Default 0.90; warn if `U > 0.95`.
- Runtime reserve (GB per GPU): Fixed safety headroom subtracted after utilization (e.g., 2 GB).

Computation mapping (per deployment d, per GPU g):

- Budget per GPU `B_g` = `U × capacity_bytes_g − reserve_bytes`.
- Weight bytes per GPU for deployment d on g: `W_{d,g}` = `(params × bytes_per_param(weightDtype) / tp_d) × (1 + replication_overhead_pct)` if `g ∈ assignedGpuIds_d`, else 0.
- GQA aware KV per token per GPU for d on g:
  - `headDim = hidden_size / heads`
  - `K_tok_{d,g}` = `2 × layers × numKeyValueHeads × headDim × bytes_per_elem(kvDtype) / tp_d × (1 + kv_overhead_pct)` if `g ∈ assignedGpuIds_d`, else 0.
- Total tokens in cache for d: `T_tot_d = max_num_seqs_d × max_model_len_d`.
- KV total per GPU for d: `K_{d,g} = K_tok_{d,g} × T_tot_d`.
- Aggregate per GPU: `W_g = Σ_d W_{d,g}`; `K_g = Σ_d K_{d,g}`.

Fit condition per GPU: `W_g + K_g ≤ B_g`.

Notes:

- Paged‑attention block metadata varies; KV overhead captures typical cases. We may add block‑size modeling in v2.
- Prefill/activation workspace is transient and excluded in v1; steady‑state decode KV dominates.

### Multi‑GPU Behavior (detailed)

- Tensor Parallel (TP) sharding per deployment; `tp ≤ |assignedGpuIds|`.
- Weights and KV cache are evenly sharded across the deployment’s TP GPUs.
- Multiple deployments may overlap on the same GPU; their shards’ weights and KV add up on that GPU.
- Mixed GPU capacities inside a deployment’s TP set are discouraged (soft warning), but allowed in v1.
- Divisibility hint: Recommend `tp` that divides the model’s attention heads or GQA groups to avoid uneven shards.
- Scope: Single‑host only in v1; multi‑node not modeled.

### GPU Memory Utilization & Safeties (detailed)

- Utilization `U` and runtime reserve control the budget: `B_g = U × capacity_bytes_g − reserve_bytes`.
- Warning: If `U > 0.95`, show increased OOM risk due to fragmentation and runtime variance.
- Errors:
  - Weight budget: If `Σ_d W_{d,g} > B_g`, show “Insufficient memory for model weights under current utilization.”
  - Minimal KV viability (per deployment d on g): Let `T_min = 1` token per sequence and `S_min = max(1, max_num_seqs_d)`. If `B_g − Σ_d W_{d,g} < Σ_d (K_tok_{d,g} × T_min × S_min)`, show “Insufficient memory for minimal KV cache.”

### Recommendations (derive vLLM flags)

For deployment d on GPU g, let `L_g = max(B_g − Σ_d W_{d,g}, 0)` and consider only d’s share of KV per token `K_tok_{d,g}`:

- Suggested `--max-model-len` for fixed `num_seq = S`:
  - `max_model_len = floor(L_g / (K_tok_{d,g} × S))`
- Suggested `--max-num-seqs` for fixed `max_model_len = T`:
  - `max_num_seqs = floor(L_g / (K_tok_{d,g} × T))`
- Optional safety factor: Apply 0.98 to account for runtime variance.
- UI: Display suggestions per deployment with an “Apply” action.

---

## Estimation Formulas (Reference)

- headDim = `hiddenSize / heads`
- Bytes per param (weights): bf16/fp16 = 2; fp32 = 4; q8 ≈ 1; q4 ≈ 0.5
- Bytes per KV element: bf16/fp16 = 2; fp8/int8 = 1
- Weight bytes per GPU: `(paramsB×1e9 × bytesPerParam(weightDtype) / tp) × (1 + replicationOverheadPct)`
- KV bytes per token per GPU: `2 × layers × numKeyValueHeads × headDim × bytesPerKvElem(kvDtype) / tp × (1 + kvOverheadPct)`
- Total KV per GPU (deployment d): `kvPerTokPerGpu × (max_model_len × max_num_seqs)`
- Usable budget per GPU: `B_g = U × gpu_capacity_bytes − reserve_bytes`
- Fit condition per GPU: `Σ_d weights_d + Σ_d kv_d ≤ B_g`

Notes: Approximations assume even sharding under tensor parallelism; minor replicated modules are covered by the replication overhead term.

---

## Glossary

- TP: Tensor Parallel degree (number of shards/GPUs sharing model layers).
- KV cache: Attention key/value tensors stored per token per layer for decoding.
- GPU memory utilization (U): Fraction of total GPU memory reserved for model weights and KV (e.g., 0.90).
- Replication overhead: Safety factor modeling unsharded/replicated params and runtime buffers on each GPU.

---

## Appendix: UI Tokens (v1)

CSS variables (used by Tailwind via `:root` and `.dark` overrides):

- Colors
  - `--color-weights`: rgb(37 99 235)   [Tailwind `blue-600`]
  - `--color-kv`:      rgb(245 158 11)  [Tailwind `amber-500`]
  - `--color-reserve`: rgb(113 113 122) [Tailwind `zinc-500`]
  - `--color-unalloc`: rgb(212 212 216) [Tailwind `zinc-300`]
  - `--color-free`:    rgb(16 185 129)  [Tailwind `emerald-500`]
- Typography
  - `--font-sans`: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Noto Sans, "Apple Color Emoji", "Segoe UI Emoji";
  - `--font-mono`: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New";
- Sizing & spacing
  - `--bar-height`: 20px
  - `--radius-sm`: 6px
  - `--gap-sm`: 8px

Dark mode color overrides (suggested):

- `--color-unalloc`: rgb(63 63 70)  [zinc-700]
- `--color-reserve`: rgb(161 161 170) [zinc-400]

Formatting conventions:

- Units: Display GiB by default; allow toggling to GB. When GiB, convert bytes → GiB using 1024^3.
- Precision: 1 decimal for GiB and percentage values inside bars and legends.
- Truncation: If a segment < 2px width, collapse label and show full value on hover/tooltip and in aria-label.

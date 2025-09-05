# PRD: LLM GPU vRAM Calculator (v1)

Slug: llm-gpu-calc (proposed)

---

## Clarifying Questions (with current assumptions)

1) Primary users and context? Assumed: ML engineers and platform/devops sizing vLLM inference clusters.
2) Scope for v1? Assumed: Frontend-only calculator with predefined GPU/model catalogs; no backend or live vLLM integration.
3) Models and precision? Assumed: Inference only. Default weight dtype BF16/FP16 (2 bytes/param); optional 4/8-bit later.
4) KV cache inputs? Assumed: User provides max input tokens, avg output tokens, and concurrent requests; calculator estimates KV cache.
5) Multi-GPU behavior? Assumed: Tensor parallel (TP). Weights and KV cache shard evenly across selected GPUs by TP degree.
6) GPU memory utilization? Assumed: User sets `--gpu-memory-utilization` (0..1). Default 0.90. Warn if > 0.95; error if budget cannot fit weights + minimal KV.
7) Visualization library? Assumed: Custom lightweight SVG bar chart; defer third-party chart libs for now.
8) Target platform? Assumed: Web app (Vue 3 + TS + Vite); state via Pinia.

Please confirm or adjust the above; v2 will reflect changes.

---

## Context

Sizing vLLM deployments is tricky: vRAM usage depends on model weights, tensor parallelism, dtype/quantization, KV cache growth with sequence lengths and concurrency, and reserved overhead. A visual calculator helps engineers quickly assess whether a chosen GPU set can host a model and workload, and how memory breaks down per GPU.

## Goals

- Provide an interactive calculator to estimate per‑GPU vRAM usage for vLLM inference.
- Support selecting one or more GPU types with known capacities and a target TP degree.
- Support selecting a model from a predefined catalog (params, layers, hidden size, heads, dtype).
- Accept workload/config inputs affecting KV cache (input tokens, avg output, concurrency), GPU memory utilization, and KV overhead.
- Visualize, per GPU, the breakdown: weights, KV cache, unallocated (1−U), and free capacity.

## Non‑Goals

- No live deployment, autoscaling, or performance measurement in v1.
- No training/finetuning memory modeling (optimizer/gradients out of scope).
- No loader‑specific nuances (e.g., tensor parallel replication anomalies) beyond simple approximations.
- No model download/quantization flows; quantized weights are a future enhancement.

## User Stories

- As an ML platform engineer, I select H100×4 and Gemma‑3‑27B to see if TP=4 fits with 4096 input and 256 output tokens at 8 concurrent requests.
- As a dev, I tweak `--gpu-memory-utilization` from 0.90 to 0.95 and see the effect on fit/free vRAM instantly per GPU.
- As a PM, I compare L40S vs H100 capacities to understand cost/performance trade‑offs for a target workload.

## Acceptance Criteria

- GPU selection allows one or more GPUs from a predefined list (e.g., H100 80GB, L40S 48GB); shows capacity per GPU.
- Model selection allows predefined models (e.g., Gemma‑3‑27B, Phi‑4) with metadata sufficient for estimates.
- Inputs: TP degree (1..N), GPU memory utilization `U` (0..1), KV overhead %, dtype (BF16/FP16 initially), input context tokens, avg output tokens, concurrent requests.
- The calculator computes per‑GPU memory breakdown and overall fit (OK/Over capacity) using formulas below.
- Visualization renders one bar per selected GPU, segmented into weights, KV cache, unallocated (1−U), and free space; labels show GB and %.
- Warnings/Errors:
  - Warn if `U > 0.95` about increased OOM risk.
  - Error if per‑GPU weights `W` exceed budget `B = U × capacity`.
  - Error if minimal KV requirement `KV_min` is not met: `B − W < K_tok_gpu × (input_tokens + 1) × max(1, concurrency)` (rounded to page size if provided).
- Multi‑GPU constraints: Mixed GPU capacities in a TP group are rejected in v1; TP must be ≤ number of selected GPUs.
- Recommendations: Show suggested `--max-model-len` (given `num_seq`) and `--max-num-seq` (given `max-model-len`) with an “Apply” action.
- All domain calculations covered by unit tests; UI behavior smoke‑tested.

## UX Notes

- Stepper layout: 1) Select GPU(s) → 2) Select Model → 3) Configure Workload → 4) Results.
- Results view: grid of GPU bars with a legend and a summary (fit status, min/max free GB across GPUs).
- Accessibility: keyboard navigable, sufficient contrast, ARIA labels for segmented bars.

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

- Input tokens: Maximum prompt length (context) per request. Example: 4096.
- Average output tokens: Typical generated tokens per request. Example: 256. For conservative sizing, allow using a max value.
- Concurrency (active sequences): Number of requests served concurrently (effective batch). With continuous batching, use expected peak concurrent sequences.
- DType: BF16/FP16 in v1. Determines bytes per parameter and per KV element (2 bytes).
- KV overhead %: Accounts for allocator/paging/metadata overhead in KV cache (default 10%).
- GPU memory utilization `U` (0..1): Fraction of each GPU’s capacity available to the model (weights + KV). Default 0.90. Warning if `U > 0.95`.

Computation mapping:

- Budget per GPU `B` ≈ `U × capacity_bytes`.
- Weight bytes per GPU `W` ≈ `(params × bytes_per_param) / TP`.
- KV per token per GPU `K_tok_gpu` ≈ `2 × hidden_size × bytes_per_elem × layers / TP × (1 + kv_overhead_pct)`.
- Total tokens in cache `T_tot` ≈ `concurrency × (input_tokens + output_tokens)`.
- Total KV per GPU `K_total` ≈ `K_tok_gpu × T_tot`.

Notes:

- Beam search, speculative decoding, and paged‑attention metadata vary by implementation; default overhead covers typical cases.
- Prefill/activation workspace is transient and excluded in v1; the dominant steady component is KV cache.

### Multi‑GPU Behavior (detailed)

- Tensor Parallel (TP) only in v1. The model is sharded across `TP` GPUs.
- Weights: Evenly sharded across TP ⇒ per‑GPU weights ≈ `(params × bytes_per_param) / TP`.
- KV cache: Partitioned across TP (e.g., by heads) ⇒ per‑GPU KV ≈ `1/TP` of total KV.
- Homogeneous group (v1): Enforce identical GPU type and capacity for the TP group. Mixed capacities cause imbalance and are rejected.
- TP degree selection: Default `TP = number_of_selected_GPUs`; allow manual override ≤ number_of_selected_GPUs. Validate `TP ≥ 1`.
- Divisibility hint: Recommend choosing `TP` that divides the model’s attention heads or GQA groups (when known) to avoid uneven shard sizes; surface as a soft warning.
- Scope: Single‑host only in v1; multi‑node not modeled.

### GPU Memory Utilization & Safeties (detailed)

- Utilization `U` controls the budget: `B = U × capacity_bytes` per GPU.
- Warning: If `U > 0.95`, show a warning about higher OOM risk due to fragmentation and runtime variance.
- Errors:
  - Weight budget: If `W > B`, show “Insufficient memory for model weights under current utilization.”
  - Minimal KV viability: Let `T_min = input_tokens + min_output_tokens` (default `min_output_tokens = 1`) and `S_min = max(1, concurrency)` (or 1 if concurrency not set). If `B − W < K_tok_gpu × T_min × S_min`, show “Insufficient memory for minimal KV cache.”

### Recommendations (derive vLLM flags)

Given the per‑GPU KV budget `L = max(B − W, 0)` and `K_tok_gpu`:

- Recommended `--max-model-len` for a fixed `num_seq = S`:
  - `max_model_len = floor(L / (K_tok_gpu × S))`
- Recommended `--max-num-seq` for a fixed `max_model_len = T`:
  - `max_num_seq = floor(L / (K_tok_gpu × T))`
- Optional safety factor: Apply 0.98 to account for runtime variance.
- UI affordance: Display suggestions alongside current inputs with an “Apply” button.

---

## Estimation Formulas (Reference)

- Bytes per param (weights): BF16/FP16 = 2; FP32 = 4; Q8 ≈ 1; Q4 ≈ 0.5 (future).
- Weights per GPU: `(params × bytes_per_param) / TP`.
- KV per token per GPU: `2 × hidden_size × bytes_per_elem × layers / TP`.
- Total KV per GPU: `kv_per_token_per_gpu × total_tokens × (1 + kv_overhead_pct)`.
- Usable budget per GPU: `B = U × gpu_capacity`.
- Fit condition: `weights + kv <= B`.

Notes: Approximations assume even sharding under tensor parallelism and ignore minor replicated modules.

---

## Glossary

- TP: Tensor Parallel degree (number of shards/GPUs sharing model layers).
- KV cache: Attention key/value tensors stored per token per layer for decoding.
- GPU memory utilization (U): Fraction of total GPU memory reserved for model weights and KV (e.g., 0.90).

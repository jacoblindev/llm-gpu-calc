import type { DType, Deployment, Gpu, KvDType, Model } from '@shared/types';

/**
 * Bytes per model parameter for a given weight dtype.
 * Units: bytes per parameter. Examples — fp32: 4, fp16/bf16: 2, q8: 1, q4: 0.5.
 * See ADR-0002 for dtype assumptions.
 */
export function bytesPerParam(_dtype: DType): number {
  switch (_dtype) {
    case 'fp32':
      return 4;
    case 'fp16':
    case 'bf16':
      return 2;
    case 'q8':
      return 1;
    case 'q4':
      return 0.5;
    default:
      return 0;
  }
}

/**
 * Bytes per KV cache element for a given KV dtype.
 * Units: bytes per element. Examples — fp16/bf16: 2, fp8/int8: 1.
 * See ADR-0002 for dtype assumptions.
 */
export function bytesPerKvElem(_dtype: KvDType): number {
  switch (_dtype) {
    case 'fp16':
    case 'bf16':
      return 2;
    case 'fp8':
    case 'int8':
      return 1;
    default:
      return 0;
  }
}
/**
 * Per-GPU bytes for model weights under TP and replication overhead.
 * Formula: (paramsB × 1e9 × bytesPerParam(dtype) ÷ tp) × (1 + replicationOverheadPct).
 * Units: bytes. replicationOverheadPct is a fraction (e.g., 0.02 = 2%).
 */
export function weightBytesPerGpu(
  _paramsB: number,
  _dtype: DType,
  _tp: number,
  _replicationOverheadPct: number,
): number {
  if (_tp <= 0) return 0;
  const totalParamBytes = _paramsB * 1e9 * bytesPerParam(_dtype);
  const perGpu = totalParamBytes / _tp;
  return perGpu * (1 + _replicationOverheadPct);
}

/**
 * GQA-aware KV cache bytes per token per GPU.
 * Formula: 2 × layers × numKeyValueHeads × (hidden/heads) × bytesPerKvElem(kvDtype) ÷ tp × (1 + kvOverheadPct).
 * Units: bytes per token per GPU. Percentages are fractions (e.g., 0.10 = 10%).
 * See ADR-0002 and ARCH-v1 Domain contracts.
 */
export function kvBytesPerTokenPerGpu(
  _layers: number,
  _hidden: number,
  _heads: number,
  _numKeyValueHeads: number,
  _kvDtype: KvDType,
  _tp: number,
  _kvOverheadPct: number,
): number {
  if (_tp <= 0 || _heads <= 0) return 0;
  const headDim = _hidden / _heads;
  const bytes = bytesPerKvElem(_kvDtype);
  const base = 2 * _layers * _numKeyValueHeads * headDim * bytes;
  const perGpu = base / _tp;
  return perGpu * (1 + _kvOverheadPct);
}

/**
 * Effective per-GPU memory budget after utilization headroom and fixed reserve.
 * Formula: budget = utilization × capacityBytes − reserveBytes.
 * Units: bytes. utilization ∈ [0,1].
 */
export function budgetBytesPerGpu(
  _capacityBytes: number,
  _utilization: number,
  _reserveBytes: number,
): number {
  return _utilization * _capacityBytes - _reserveBytes;
}

/**
 * Total KV cache bytes per GPU given total active tokens across sequences.
 * Formula: tokensTotal × perTokBytesPerGpu. Guards non-positive inputs.
 * Units: bytes.
 */
export function kvTotalBytesPerGpu(
  _tokensTotal: number,
  _perTokBytesPerGpu: number,
): number {
  if (_tokensTotal <= 0 || _perTokBytesPerGpu <= 0) return 0;
  return _tokensTotal * _perTokBytesPerGpu;
}

/**
 * Aggregates per-GPU memory usage across possibly overlapping deployments.
 * For each GPU, sums weights and KV from deployments assigned to it and computes free = max(budget − used, 0).
 * Returns Map gpuId → { used, free, parts[] }, where parts hold per-deployment breakdowns.
 * Units: bytes. Formulas per ADR-0002.
 */
export function aggregatePerGpu(
  _deployments: Deployment[],
  _gpus: Gpu[],
  _models: Record<string, Model>,
  _utilization: number,
  _reserveBytes: number,
): Map<string, { used: number; free: number; parts: Array<{ deploymentId: string; weights: number; kv: number }> }> {
  const result = new Map<string, { used: number; free: number; parts: Array<{ deploymentId: string; weights: number; kv: number }> }>();
  for (const gpu of _gpus) {
    const budget = budgetBytesPerGpu(gpu.vramBytes, _utilization, _reserveBytes);
    let used = 0;
    const parts: Array<{ deploymentId: string; weights: number; kv: number }> = [];
    for (const d of _deployments) {
      if (!d.assignedGpuIds.includes(gpu.id)) continue;
      const model = _models[d.modelId];
      if (!model) continue;
      const weights = weightBytesPerGpu(model.paramsB, d.weightDtype, d.tp, d.replicationOverheadPct);
      const perTok = kvBytesPerTokenPerGpu(
        model.layers,
        model.hiddenSize,
        model.heads,
        model.numKeyValueHeads,
        d.kvDtype,
        d.tp,
        d.kvOverheadPct,
      );
      const tokensTotal = d.maxModelLen * d.maxNumSeqs;
      const kv = kvTotalBytesPerGpu(tokensTotal, perTok);
      used += weights + kv;
      parts.push({ deploymentId: d.id, weights, kv });
    }
    const free = Math.max(budget - used, 0);
    result.set(gpu.id, { used, free, parts });
  }
  return result;
}

/**
 * Suggests max_model_len given remaining KV budget, KV bytes per token per GPU, and number of sequences.
 * Formula: floor(budgetBytes / (kvPerTokenPerGpu × numSeq)). Returns 0 if inputs are non-positive.
 * Units: returns tokens (integer ≥ 0).
 */
export function suggestMaxModelLen(
  _budgetBytes: number,
  _kvPerTokenPerGpu: number,
  _numSeq: number,
): number {
  if (_budgetBytes <= 0 || _kvPerTokenPerGpu <= 0 || _numSeq <= 0) return 0;
  const denom = _kvPerTokenPerGpu * _numSeq;
  if (denom <= 0) return 0;
  return Math.floor(_budgetBytes / denom);
}

/**
 * Suggests max_num_seqs given remaining KV budget, KV bytes per token per GPU, and model length.
 * Formula: floor(budgetBytes / (kvPerTokenPerGpu × modelLen)). Returns 0 if inputs are non-positive.
 * Units: returns sequences (integer ≥ 0).
 */
export function suggestMaxNumSeq(
  _budgetBytes: number,
  _kvPerTokenPerGpu: number,
  _modelLen: number,
): number {
  if (_budgetBytes <= 0 || _kvPerTokenPerGpu <= 0 || _modelLen <= 0) return 0;
  const denom = _kvPerTokenPerGpu * _modelLen;
  if (denom <= 0) return 0;
  return Math.floor(_budgetBytes / denom);
}

/**
 * Derives per-GPU fit status and reasons from aggregated usage.
 * Rules:
 * - Error when free ≤ 0: "Over capacity or no headroom".
 * - Error when any part has weights > 0 and kv ≤ 0: "Minimal KV not met".
 * - Warning when used/(used+free) > 0.95: "High utilization > 95%".
 * Returns an array of { gpuId, ok, reason? } for UI display. Units: bytes.
 */
export function fitChecks(
  _perGpu: Map<string, { used: number; free: number; parts: Array<{ deploymentId: string; weights: number; kv: number }> }>,
): Array<{ gpuId: string; ok: boolean; reason?: string }> {
  const out: Array<{ gpuId: string; ok: boolean; reason?: string }> = [];
  for (const [gpuId, info] of _perGpu.entries()) {
    const budget = info.used + info.free; // budget after utilization/reserve
    const reasons: string[] = [];
    let ok = true;

    // Over/no headroom
    if (info.free <= 0) {
      reasons.push('Over capacity or no headroom');
      ok = false;
    }

    // High utilization warning (informational)
    let highUtil = false;
    if (budget > 0) {
      const ratio = info.used / budget;
      if (ratio > 0.95) {
        reasons.push('High utilization > 95%');
        highUtil = true;
      }
    }

    // Minimal KV viability: if any deployment has weights but zero KV bytes, flag as error
    // Skip this check when already in high-utilization territory to avoid masking the warning case.
    if (!highUtil) {
      for (const p of info.parts) {
        if (p.weights > 0 && p.kv <= 0) {
          reasons.push('Minimal KV not met');
          ok = false;
          break;
        }
      }
    }

    const reason = reasons.length ? reasons.join('; ') : undefined;
    out.push({ gpuId, ok, reason });
  }
  return out;
}

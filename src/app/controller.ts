import type { AppState } from './state';
import type { Deployment, DType, Gpu, KvDType, Model, UnitPreference } from '@shared/types';
import { listGpus, listModels } from '@data/catalog';
import { bytesToGB, bytesToGiB } from '@shared/units';
import { kvBytesPerTokenPerGpu, kvTotalBytesPerGpu, weightBytesPerGpu, fitChecks, suggestMaxModelLen, suggestMaxNumSeq } from '@domain/memory';

export function init(state: AppState): void {
  state.gpuCatalog = listGpus();
  state.models = listModels();
}

export function recompute(_state: AppState): void {
  // aggregation and results will be implemented in 4.x/5.x
}

export function newDeployment(state: AppState): Deployment {
  const model = state.models[0] as Model | undefined;
  const id = `dep_${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    modelId: model?.id ?? '',
    assignedGpuIds: [],
    tp: 1,
    weightDtype: (model?.defaultWeightDtype ?? 'bf16') as DType,
    kvDtype: (model?.defaultKvDtype ?? 'fp16') as KvDType,
    kvOverheadPct: 0.10,
    replicationOverheadPct: 0.02,
    maxModelLen: 4096,
    maxNumSeqs: 1,
    utilizationShare: 0.90,
  };
}

export function addDeployment(state: AppState): void {
  state.deployments.push(newDeployment(state));
}

export function removeDeployment(state: AppState, id: string): void {
  state.deployments = state.deployments.filter((d) => d.id !== id);
}

export function setUnit(state: AppState, unit: UnitPreference): void {
  state.unit = unit;
  try { localStorage.setItem('unitPreference', unit); } catch {}
}

export function loadUnitPreference(state: AppState): void {
  try {
    const u = localStorage.getItem('unitPreference') as UnitPreference | null;
    if (u === 'GiB' || u === 'GB') state.unit = u;
  } catch {}
}

// Utilization handling has moved to per-deployment. Runtime reserve is implied as 1 - Σ U on each GPU.

export function gpuCapacityLabel(gpu: Gpu): string {
  const gb = bytesToGB(gpu.vramBytes).toFixed(1);
  const gib = bytesToGiB(gpu.vramBytes).toFixed(1);
  return `${gb} GB (${gib} GiB)`;
}

function makeGpuInstances(type: Gpu, count: number): Gpu[] {
  const out: Gpu[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      id: `${type.id}#${i + 1}`,
      name: `${type.name} #${i + 1}`,
      vramBytes: type.vramBytes,
      vendor: type.vendor,
    });
  }
  return out;
}

function rebuildSelectedGpus(state: AppState): void {
  const result: Gpu[] = [];
  for (const t of state.gpuCatalog) {
    const c = Math.max(0, Math.floor(state.gpuCounts[t.id] ?? 0));
    if (c > 0) result.push(...makeGpuInstances(t, c));
  }
  state.gpus = result;
  // Clamp/align deployments TP against new selection
  for (const d of state.deployments) {
    d.assignedGpuIds = d.assignedGpuIds.filter((id) => state.gpus.some((g) => g.id === id));
    d.tp = Math.max(1, Math.min(d.tp, d.assignedGpuIds.length || 1));
  }
}

export function setGpuCount(state: AppState, typeId: string, count: number): void {
  state.gpuCounts[typeId] = Math.max(0, Math.floor(Number.isFinite(count) ? count : 0));
  rebuildSelectedGpus(state);
}

export function incrementGpu(state: AppState, typeId: string, delta: number): void {
  const next = Math.max(0, (state.gpuCounts[typeId] ?? 0) + delta);
  setGpuCount(state, typeId, next);
}

export function utilizationByGpu(state: AppState): Map<string, number> {
  // Sum utilization shares across deployments that included the GPU
  const map = new Map<string, number>();
  for (const g of state.gpus) map.set(g.id, 0);
  for (const d of state.deployments) {
    for (const gid of d.assignedGpuIds) {
      if (!map.has(gid)) continue;
      map.set(gid, (map.get(gid) || 0) + (d.utilizationShare || 0));
    }
  }
  return map;
}

export function impliedReserveByGpu(state: AppState): Map<string, number> {
  const u = utilizationByGpu(state);
  const res = new Map<string, number>();
  for (const [gid, sum] of u.entries()) {
    res.set(gid, Math.max(0, 1 - sum));
  }
  return res;
}

export function computeResultsStub(state: AppState): Array<{
  gpuId: string;
  gpuName: string;
  capacityBytes: number;
  utilizationSum: number;
  impliedReserveFrac: number;
  usedBytes: number;
  parts: Array<{ deploymentId: string; modelName: string; weights: number; kv: number }>
}> {
  const util = utilizationByGpu(state);
  const res = impliedReserveByGpu(state);
  const modelsById = Object.fromEntries(state.models.map(m => [m.id, m] as const));
  const out: Array<{ gpuId: string; gpuName: string; capacityBytes: number; utilizationSum: number; impliedReserveFrac: number; usedBytes: number; parts: Array<{ deploymentId: string; modelName: string; weights: number; kv: number }> }> = [];
  for (const g of state.gpus) {
    let used = 0;
    const parts: Array<{ deploymentId: string; modelName: string; weights: number; kv: number }> = [];
    for (const d of state.deployments) {
      if (!d.assignedGpuIds.includes(g.id)) continue;
      const model = modelsById[d.modelId];
      if (!model) continue;
      const tp = Math.max(1, d.assignedGpuIds.length);
      const weights = weightBytesPerGpu(model.paramsB, d.weightDtype, tp, d.replicationOverheadPct);
      const perTok = kvBytesPerTokenPerGpu(model.layers, model.hiddenSize, model.heads, model.numKeyValueHeads, d.kvDtype, tp, d.kvOverheadPct);
      const tokens = d.maxModelLen * d.maxNumSeqs;
      const kv = kvTotalBytesPerGpu(tokens, perTok);
      used += weights + kv;
      parts.push({ deploymentId: d.id, modelName: model.name, weights, kv });
    }
    out.push({
      gpuId: g.id,
      gpuName: g.name,
      capacityBytes: g.vramBytes,
      utilizationSum: util.get(g.id) || 0,
      impliedReserveFrac: res.get(g.id) || 0,
      usedBytes: used,
      parts,
    });
  }
  return out;
}

export function buildPerGpuBars(state: AppState): Array<{
  gpuId: string;
  gpuName: string;
  capacityBytes: number;
  segments: Array<{
    kind: 'weights' | 'kv' | 'reserve' | 'free';
    bytes: number;
    deploymentId?: string;
    modelName?: string;
  }>;
}> {
  const results = computeResultsStub(state);
  return results.map((r) => {
    const reserveBytes = Math.max(0, r.impliedReserveFrac * r.capacityBytes);
    const used = Math.max(0, r.usedBytes);
    const freeBytes = Math.max(0, r.capacityBytes - reserveBytes - used);
    const segments: Array<{ kind: 'weights' | 'kv' | 'reserve' | 'free'; bytes: number; deploymentId?: string; modelName?: string }> = [];
    for (const p of r.parts) {
      if (p.weights > 0) segments.push({ kind: 'weights', bytes: p.weights, deploymentId: p.deploymentId, modelName: p.modelName });
      if (p.kv > 0) segments.push({ kind: 'kv', bytes: p.kv, deploymentId: p.deploymentId, modelName: p.modelName });
    }
    if (reserveBytes > 0) segments.push({ kind: 'reserve', bytes: reserveBytes });
    if (freeBytes > 0) segments.push({ kind: 'free', bytes: freeBytes });
    return { gpuId: r.gpuId, gpuName: r.gpuName, capacityBytes: r.capacityBytes, segments };
  });
}

export function buildPerGpuFitStatus(state: AppState): Array<{
  gpuId: string;
  ok: boolean;
  reason?: string;
  used: number;
  free: number;
}> {
  const results = computeResultsStub(state);
  const perGpuMap = new Map<string, { used: number; free: number; parts: Array<{ deploymentId: string; weights: number; kv: number }> }>();
  for (const r of results) {
    const reserveBytes = Math.max(0, r.impliedReserveFrac * r.capacityBytes);
    const used = Math.max(0, r.usedBytes);
    const free = Math.max(0, r.capacityBytes - reserveBytes - used);
    perGpuMap.set(r.gpuId, { used, free, parts: r.parts.map(p => ({ deploymentId: p.deploymentId, weights: p.weights, kv: p.kv })) });
  }
  const checks = fitChecks(perGpuMap);
  // Attach used/free for display
  return checks.map(c => {
    const m = perGpuMap.get(c.gpuId)!;
    return { gpuId: c.gpuId, ok: c.ok, reason: c.reason, used: m.used, free: m.free };
  });
}

export function computeDeploymentSuggestions(state: AppState, deploymentId: string): { maxModelLen: number; maxNumSeqs: number } {
  const d = state.deployments.find(x => x.id === deploymentId);
  if (!d) return { maxModelLen: 0, maxNumSeqs: 0 };
  const modelsById: Record<string, Model | undefined> = Object.fromEntries(state.models.map(m => [m.id, m] as const));
  const model = modelsById[d.modelId];
  if (!model || d.assignedGpuIds.length === 0) return { maxModelLen: 0, maxNumSeqs: 0 };

  // Precompute weights for all deployments per GPU for budget subtraction
  const tp = Math.max(1, d.assignedGpuIds.length);
  const util = utilizationByGpu(state);
  const perTok = kvBytesPerTokenPerGpu(model.layers, model.hiddenSize, model.heads, model.numKeyValueHeads, d.kvDtype, tp, d.kvOverheadPct);
  const weightsD = weightBytesPerGpu(model.paramsB, d.weightDtype, tp, d.replicationOverheadPct);

  const SAFETY = 0.98; // leave headroom so fitChecks doesn't flag zero-free as over
  let bestLen = Infinity;
  let bestSeq = Infinity;
  for (const gid of d.assignedGpuIds) {
    const gpu = state.gpus.find(g => g.id === gid);
    if (!gpu) continue;
    const capacity = gpu.vramBytes;
    const sumU = util.get(gid) || 0;
    const reserveBytes = Math.max(0, 1 - sumU) * capacity;
    const budgetBytes = Math.max(0, capacity - reserveBytes);
    // Sum usage of OTHER deployments on this GPU (weights + KV), exclude current deployment d
    let usedByOthers = 0;
    for (const other of state.deployments) {
      if (!other.assignedGpuIds.includes(gid) || other.id === d.id) continue;
      const omodel = modelsById[other.modelId];
      if (!omodel) continue;
      const otp = Math.max(1, other.assignedGpuIds.length);
      const oWeights = weightBytesPerGpu(omodel.paramsB, other.weightDtype, otp, other.replicationOverheadPct);
      const oPerTok = kvBytesPerTokenPerGpu(omodel.layers, omodel.hiddenSize, omodel.heads, omodel.numKeyValueHeads, other.kvDtype, otp, other.kvOverheadPct);
      const oTokens = other.maxModelLen * other.maxNumSeqs;
      const oKv = kvTotalBytesPerGpu(oTokens, oPerTok);
      usedByOthers += oWeights + oKv;
    }
    // Available for d's KV = budget - others' usage - d's weights
    const kvBudget = Math.max(0, budgetBytes - usedByOthers - weightsD);
    const safeKvBudget = kvBudget * SAFETY;
    const len = suggestMaxModelLen(safeKvBudget, perTok, d.maxNumSeqs);
    const seq = suggestMaxNumSeq(safeKvBudget, perTok, d.maxModelLen);
    if (Number.isFinite(len)) bestLen = Math.min(bestLen, len);
    if (Number.isFinite(seq)) bestSeq = Math.min(bestSeq, seq);
  }
  if (!Number.isFinite(bestLen)) bestLen = 0;
  if (!Number.isFinite(bestSeq)) bestSeq = 0;
  return { maxModelLen: Math.max(0, Math.floor(bestLen)), maxNumSeqs: Math.max(0, Math.floor(bestSeq)) };
}

export function applySuggestedMaxModelLen(state: AppState, deploymentId: string): void {
  const s = computeDeploymentSuggestions(state, deploymentId);
  const d = state.deployments.find(x => x.id === deploymentId);
  if (d) d.maxModelLen = s.maxModelLen;
}

export function applySuggestedMaxNumSeqs(state: AppState, deploymentId: string): void {
  const s = computeDeploymentSuggestions(state, deploymentId);
  const d = state.deployments.find(x => x.id === deploymentId);
  if (d) d.maxNumSeqs = s.maxNumSeqs;
}

export function validateDeployment(d: Deployment, gpus: Gpu[]): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const assigned = gpus.filter((g) => d.assignedGpuIds.includes(g.id));
  if (d.tp > assigned.length) {
    errors.push('TP must be ≤ number of assigned GPUs');
  }
  // mixed capacity warning
  const caps = Array.from(new Set(assigned.map((g) => g.vramBytes)));
  if (caps.length > 1 && assigned.length > 0) {
    warnings.push('Mixed GPU capacities in TP group');
  }
  return { errors, warnings };
}

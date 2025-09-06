import type { AppState } from './state';
import type { Deployment, DType, Gpu, KvDType, Model, UnitPreference } from '@shared/types';
import { listGpus, listModels } from '@data/catalog';
import { bytesToGB, bytesToGiB } from '@shared/units';
import { kvBytesPerTokenPerGpu, kvTotalBytesPerGpu, weightBytesPerGpu } from '@domain/memory';

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
  const modelsById = Object.fromEntries(state.models.map(m => [m.id, m] as const)) as Record<string, Model>;
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

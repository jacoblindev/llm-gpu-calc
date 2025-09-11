import type { AppState } from './state';
import type { Deployment, DType, Gpu, KvDType, Model, UnitPreference } from '@shared/types';
import { listGpus, listModels } from '@data/catalog';
import { bytesToGB, bytesToGiB } from '@shared/units';
import { kvBytesPerTokenPerGpu, kvTotalBytesPerGpu, weightBytesPerGpu, fitChecks, suggestMaxModelLen, suggestMaxNumSeq } from '@domain/memory';

/**
 * Initializes the application state with static catalogs.
 * Populates `gpuCatalog` and `models` from data sources.
 */
export function init(state: AppState): void {
  state.gpuCatalog = listGpus();
  state.models = listModels();
}

/**
 * Creates a new Deployment with sensible defaults based on the first model,
 * including dtypes, overheads, and initial workload and utilization share.
 */
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

/**
 * Appends a new default deployment to state.
 */
export function addDeployment(state: AppState): void {
  state.deployments.push(newDeployment(state));
}

/**
 * Removes a deployment by id.
 */
export function removeDeployment(state: AppState, id: string): void {
  state.deployments = state.deployments.filter((d) => d.id !== id);
}

/**
 * Sets the preferred display unit and persists to localStorage (best-effort).
 */
export function setUnit(state: AppState, unit: UnitPreference): void {
  state.unit = unit;
  try { localStorage.setItem('unitPreference', unit); } catch {}
}

/**
 * Loads a persisted unit preference (if any) from localStorage.
 */
export function loadUnitPreference(state: AppState): void {
  try {
    const u = localStorage.getItem('unitPreference') as UnitPreference | null;
    if (u === 'GiB' || u === 'GB') state.unit = u;
  } catch {}
}

// Utilization handling has moved to per-deployment. Runtime reserve is implied as 1 - Σ U on each GPU.

/**
 * Returns a human-readable GPU capacity label, e.g. "80.0 GB (74.5 GiB)".
 */
export function gpuCapacityLabel(gpu: Gpu): string {
  const gb = bytesToGB(gpu.vramBytes).toFixed(1);
  const gib = bytesToGiB(gpu.vramBytes).toFixed(1);
  return `${gb} GB (${gib} GiB)`;
}

/** Returns true when any GPU is selected; drives Preview visibility in UI. */
export function shouldShowPreview(state: AppState): boolean {
  return state.gpus.length > 0;
}

/** Creates `count` instances of a GPU type with numbered ids/names. */
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

/**
 * Rebuilds `state.gpus` based on `gpuCatalog` and `gpuCounts` and
 * clamps each deployment's assigned GPU ids and tensor-parallel degree.
 */
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

/** Sets the selected count for a GPU type and rebuilds GPU instances. */
export function setGpuCount(state: AppState, typeId: string, count: number): void {
  state.gpuCounts[typeId] = Math.max(0, Math.floor(Number.isFinite(count) ? count : 0));
  rebuildSelectedGpus(state);
}

/** Increments the selected count for a GPU type by `delta`. */
export function incrementGpu(state: AppState, typeId: string, delta: number): void {
  const next = Math.max(0, (state.gpuCounts[typeId] ?? 0) + delta);
  setGpuCount(state, typeId, next);
}

/**
 * Computes Σ utilization shares per GPU across all deployments assigned to it.
 * Returns a map of gpuId → sum(U) where U ∈ [0,1].
 */
export function utilizationByGpu(state: AppState): Map<string, number> {
  // Sum utilization shares across deployments that included the GPU
  const map = new Map<string, number>();
  for (const g of state.gpus) map.set(g.id, 0);
  for (const d of state.deployments) {
    for (const gid of d.assignedGpuIds) {
      if (!map.has(gid)) continue;
      map.set(gid, (map.get(gid) ?? 0) + (d.utilizationShare ?? 0));
    }
  }
  return map;
}

/**
 * Derives the implied runtime reserve fraction per GPU as max(0, 1 − ΣU).
 */
export function impliedReserveByGpu(state: AppState): Map<string, number> {
  const u = utilizationByGpu(state);
  const res = new Map<string, number>();
  for (const [gid, sum] of u.entries()) {
    res.set(gid, Math.max(0, 1 - sum));
  }
  return res;
}

/**
 * Builds an intermediate per-GPU result used by the Results and bars views.
 * Includes capacity, ΣU, implied reserve fraction, total used bytes, and per‑deployment parts.
 */
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

/**
 * Constructs per-GPU bar segment data (weights, KV, reserve, free) for visualization.
 */
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

/**
 * Computes per-GPU fit status using domain fitChecks and attaches used/free bytes
 * for display in the UI.
 */
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

/** Validates that a deployment and model exist and has ≥1 assigned GPU. */
function validateDeploymentForSuggestions(
  deployment: Deployment | undefined,
  model: Model | undefined
): { isValid: boolean; deployment: Deployment; model: Model } | { isValid: false } {
  if (!deployment || !model || deployment.assignedGpuIds.length === 0) {
    return { isValid: false };
  }
  return { isValid: true, deployment, model };
}

/** Sums weights+KV bytes used by other deployments on a specific GPU. */
function calculateOtherDeploymentsUsage(
  gpuId: string,
  currentDeploymentId: string,
  deployments: Deployment[],
  modelsById: Record<string, Model | undefined>
): number {
  let usedByOthers = 0;
  
  for (const other of deployments) {
    if (!other.assignedGpuIds.includes(gpuId) || other.id === currentDeploymentId) {
      continue;
    }
    
    const otherModel = modelsById[other.modelId];
    if (!otherModel) continue;
    
    const otherTp = Math.max(1, other.assignedGpuIds.length);
    const otherWeights = weightBytesPerGpu(
      otherModel.paramsB,
      other.weightDtype,
      otherTp,
      other.replicationOverheadPct
    );
    const otherPerTok = kvBytesPerTokenPerGpu(
      otherModel.layers,
      otherModel.hiddenSize,
      otherModel.heads,
      otherModel.numKeyValueHeads,
      other.kvDtype,
      otherTp,
      other.kvOverheadPct
    );
    const otherTokens = other.maxModelLen * other.maxNumSeqs;
    const otherKv = kvTotalBytesPerGpu(otherTokens, otherPerTok);
    
    usedByOthers += otherWeights + otherKv;
  }
  
  return usedByOthers;
}

/**
 * Calculates the available KV budget (bytes) for a deployment on a GPU after
 * implied reserve and other deployments’ usage, applying a safety factor.
 */
function calculateKvBudgetForGpu(
  gpu: Gpu,
  deployment: Deployment,
  deploymentWeights: number,
  utilizationMap: Map<string, number>,
  deployments: Deployment[],
  modelsById: Record<string, Model | undefined>,
  safetyFactor: number = 0.98
): number {
  const capacity = gpu.vramBytes;
  const sumUtilization = utilizationMap.get(gpu.id) || 0;
  const reserveBytes = Math.max(0, (1 - sumUtilization) * capacity);
  const budgetBytes = Math.max(0, capacity - reserveBytes); // == max(0, sumUtilization * capacity)
  
  const usedByOthers = calculateOtherDeploymentsUsage(
    gpu.id,
    deployment.id,
    deployments,
    modelsById
  );
  
  const kvBudget = Math.max(0, budgetBytes - usedByOthers - deploymentWeights);
  return kvBudget * safetyFactor;
}

/**
 * Computes suggestions (max_model_len, max_num_seqs) for a single GPU.
 */
function computeSuggestionsForGpu(
  gpu: Gpu,
  deployment: Deployment,
  deploymentWeights: number,
  perTokenBytes: number,
  utilizationMap: Map<string, number>,
  deployments: Deployment[],
  modelsById: Record<string, Model | undefined>
): { maxModelLen: number; maxNumSeqs: number } {
  const kvBudget = calculateKvBudgetForGpu(
    gpu,
    deployment,
    deploymentWeights,
    utilizationMap,
    deployments,
    modelsById
  );
  
  const suggestedLen = suggestMaxModelLen(kvBudget, perTokenBytes, deployment.maxNumSeqs);
  const suggestedSeqs = suggestMaxNumSeq(kvBudget, perTokenBytes, deployment.maxModelLen);
  
  return {
    maxModelLen: Number.isFinite(suggestedLen) ? suggestedLen : 0,
    maxNumSeqs: Number.isFinite(suggestedSeqs) ? suggestedSeqs : 0
  };
}

/**
 * Computes per-deployment suggestions by evaluating all assigned GPUs and
 * taking the most constraining values (min across GPUs). Returns 0/0 when
 * the deployment/model is missing or has no assigned GPUs.
 */
export function computeDeploymentSuggestions(
  state: AppState,
  deploymentId: string
): { maxModelLen: number; maxNumSeqs: number } {
  const deployment = state.deployments.find(x => x.id === deploymentId);
  const modelsById: Record<string, Model | undefined> = Object.fromEntries(
    state.models.map(m => [m.id, m] as const)
  );
  const model = modelsById[deployment?.modelId ?? ''];
  
  const validation = validateDeploymentForSuggestions(deployment, model);
  if (!validation.isValid) {
    return { maxModelLen: 0, maxNumSeqs: 0 };
  }
  
  const { deployment: validDeployment, model: validModel } = validation;
  // Use assigned GPU count as effective TP for suggestions.
  // This aligns with how memory is actually sharded across the selected GPUs.
  const tp = Math.max(1, validDeployment.assignedGpuIds.length);
  const utilizationMap = utilizationByGpu(state);
  
  // Pre-calculate deployment-specific values
  const deploymentWeights = weightBytesPerGpu(
    validModel.paramsB,
    validDeployment.weightDtype,
    tp,
    validDeployment.replicationOverheadPct
  );
  const perTokenBytes = kvBytesPerTokenPerGpu(
    validModel.layers,
    validModel.hiddenSize,
    validModel.heads,
    validModel.numKeyValueHeads,
    validDeployment.kvDtype,
    tp,
    validDeployment.kvOverheadPct
  );
  
  // Find the most constraining GPU (minimum suggestions across all assigned GPUs)
  let bestLen = Infinity;
  let bestSeqs = Infinity;
  
  for (const gpuId of validDeployment.assignedGpuIds) {
    const gpu = state.gpus.find(g => g.id === gpuId);
    if (!gpu) continue;
    
    const suggestions = computeSuggestionsForGpu(
      gpu,
      validDeployment,
      deploymentWeights,
      perTokenBytes,
      utilizationMap,
      state.deployments,
      modelsById
    );
    
    if (suggestions.maxModelLen > 0) {
      bestLen = Math.min(bestLen, suggestions.maxModelLen);
    }
    if (suggestions.maxNumSeqs > 0) {
      bestSeqs = Math.min(bestSeqs, suggestions.maxNumSeqs);
    }
  }
  
  return {
    maxModelLen: Math.max(0, Math.floor(Number.isFinite(bestLen) ? bestLen : 0)),
    maxNumSeqs: Math.max(0, Math.floor(Number.isFinite(bestSeqs) ? bestSeqs : 0))
  };
}

/** Applies the suggested max_model_len to a deployment in-place. */
export function applySuggestedMaxModelLen(state: AppState, deploymentId: string): void {
  const s = computeDeploymentSuggestions(state, deploymentId);
  const d = state.deployments.find(x => x.id === deploymentId);
  if (d) d.maxModelLen = s.maxModelLen;
}

/** Applies the suggested max_num_seqs to a deployment in-place. */
export function applySuggestedMaxNumSeqs(state: AppState, deploymentId: string): void {
  const s = computeDeploymentSuggestions(state, deploymentId);
  const d = state.deployments.find(x => x.id === deploymentId);
  if (d) d.maxNumSeqs = s.maxNumSeqs;
}

/**
 * Validates a deployment against selected GPUs.
 * - Error when tp > assigned GPUs.
 * - Warning when assigned GPUs have mixed capacities.
 */
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

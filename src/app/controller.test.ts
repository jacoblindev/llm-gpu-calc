import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  utilizationByGpu,
  impliedReserveByGpu,
  computeDeploymentSuggestions,
  buildPerGpuBars,
  buildPerGpuFitStatus,
  validateDeployment,
  setGpuCount,
  incrementGpu,
  newDeployment,
  setUnit,
  loadUnitPreference,
  gpuCapacityLabel,
  applySuggestedMaxModelLen,
  applySuggestedMaxNumSeqs,
} from '@app/controller';
import type { AppState } from '@app/state';
import { createInitialState } from '@app/state';
import type { Deployment, Gpu, Model } from '@shared/types';
import { kvBytesPerTokenPerGpu, kvTotalBytesPerGpu, weightBytesPerGpu } from '@domain/memory';

function GiB(n: number): number {
  return n * 1024 ** 3;
}

function makeGpu(id: string, name: string, vramGiB: number): Gpu {
  return { id, name, vramBytes: GiB(vramGiB) };
}

function makeModel(partial?: Partial<Model>): Model {
  return {
    id: 'm1',
    name: 'TestModel-8B',
    paramsB: 8,
    layers: 32,
    hiddenSize: 4096,
    heads: 32,
    numKeyValueHeads: 8,
    defaultWeightDtype: 'bf16',
    defaultKvDtype: 'fp16',
    ...partial,
  };
}

function baseState(): AppState {
  return createInitialState();
}

describe('controller: utilization and reserve', () => {
  it('sums utilization per GPU and derives implied reserve', () => {
    const state = baseState();
    state.gpus = [makeGpu('g1', 'G1', 24), makeGpu('g2', 'G2', 48)];
    state.models = [makeModel()];

    const d1: Deployment = {
      id: 'd1', modelId: 'm1', assignedGpuIds: ['g1', 'g2'], tp: 1,
      weightDtype: 'bf16', kvDtype: 'fp16', kvOverheadPct: 0.1, replicationOverheadPct: 0.02,
      maxModelLen: 1024, maxNumSeqs: 1, utilizationShare: 0.4,
    };
    const d2: Deployment = {
      id: 'd2', modelId: 'm1', assignedGpuIds: ['g1'], tp: 1,
      weightDtype: 'bf16', kvDtype: 'fp16', kvOverheadPct: 0.1, replicationOverheadPct: 0.02,
      maxModelLen: 512, maxNumSeqs: 2, utilizationShare: 0.3,
    };
    state.deployments = [d1, d2];

    const u = utilizationByGpu(state);
    expect(u.get('g1')).toBeCloseTo(0.7, 6);
    expect(u.get('g2')).toBeCloseTo(0.4, 6);

    const r = impliedReserveByGpu(state);
    expect(r.get('g1')).toBeCloseTo(0.3, 6);
    expect(r.get('g2')).toBeCloseTo(0.6, 6);
  });
});

describe('controller: suggestions', () => {
  let state: AppState;
  let model: Model;
  let gpu1: Gpu;
  let gpu2: Gpu;

  beforeEach(() => {
    state = baseState();
    model = makeModel();
    state.models = [model];
    gpu1 = makeGpu('ga', 'GPU A', 80);
    gpu2 = makeGpu('gb', 'GPU B', 48);
    state.gpus = [gpu1, gpu2];
  });

  it('returns 0 suggestions for invalid deployment/model', () => {
    const d: Deployment = {
      id: 'd', modelId: 'missing', assignedGpuIds: [], tp: 1,
      weightDtype: 'bf16', kvDtype: 'fp16', kvOverheadPct: 0.1, replicationOverheadPct: 0.02,
      maxModelLen: 2048, maxNumSeqs: 2,
    };
    state.deployments = [d];
    const s = computeDeploymentSuggestions(state, 'd');
    expect(s).toEqual({ maxModelLen: 0, maxNumSeqs: 0 });
  });

  it('accounts for other deployments and chooses min across GPUs', () => {
    const dSelf: Deployment = {
      id: 'self', modelId: model.id, assignedGpuIds: ['ga', 'gb'], tp: 2,
      weightDtype: 'bf16', kvDtype: 'fp16', kvOverheadPct: 0.1, replicationOverheadPct: 0.02,
      maxModelLen: 4096, maxNumSeqs: 1, utilizationShare: 0.5,
    };
    const dOtherA: Deployment = {
      id: 'otherA', modelId: model.id, assignedGpuIds: ['ga'], tp: 1,
      weightDtype: 'bf16', kvDtype: 'fp16', kvOverheadPct: 0.1, replicationOverheadPct: 0.02,
      maxModelLen: 1024, maxNumSeqs: 4, utilizationShare: 0.2,
    };
    const dOtherB: Deployment = {
      id: 'otherB', modelId: model.id, assignedGpuIds: ['gb'], tp: 1,
      weightDtype: 'bf16', kvDtype: 'fp16', kvOverheadPct: 0.1, replicationOverheadPct: 0.02,
      maxModelLen: 8192, maxNumSeqs: 2, utilizationShare: 0.1,
    };
    state.deployments = [dSelf, dOtherA, dOtherB];

    // Expected suggestions: compute per GPU kvBudget, then min.
    const tp = Math.max(1, dSelf.assignedGpuIds.length);
    const wSelf = weightBytesPerGpu(model.paramsB, dSelf.weightDtype, tp, dSelf.replicationOverheadPct);
    const perTokSelf = kvBytesPerTokenPerGpu(
      model.layers, model.hiddenSize, model.heads, model.numKeyValueHeads,
      dSelf.kvDtype, tp, dSelf.kvOverheadPct,
    );

    // Utilization sums
    const sumU_A = (dSelf.utilizationShare ?? 0) + (dOtherA.utilizationShare ?? 0);
    const sumU_B = (dSelf.utilizationShare ?? 0) + (dOtherB.utilizationShare ?? 0);

    // Other usage bytes on each GPU
    const wOtherA = weightBytesPerGpu(model.paramsB, dOtherA.weightDtype, Math.max(1, dOtherA.assignedGpuIds.length), dOtherA.replicationOverheadPct);
    const perTokOtherA = kvBytesPerTokenPerGpu(model.layers, model.hiddenSize, model.heads, model.numKeyValueHeads, dOtherA.kvDtype, Math.max(1, dOtherA.assignedGpuIds.length), dOtherA.kvOverheadPct);
    const kvOtherA = kvTotalBytesPerGpu(dOtherA.maxModelLen * dOtherA.maxNumSeqs, perTokOtherA);

    const wOtherB = weightBytesPerGpu(model.paramsB, dOtherB.weightDtype, Math.max(1, dOtherB.assignedGpuIds.length), dOtherB.replicationOverheadPct);
    const perTokOtherB = kvBytesPerTokenPerGpu(model.layers, model.hiddenSize, model.heads, model.numKeyValueHeads, dOtherB.kvDtype, Math.max(1, dOtherB.assignedGpuIds.length), dOtherB.kvOverheadPct);
    const kvOtherB = kvTotalBytesPerGpu(dOtherB.maxModelLen * dOtherB.maxNumSeqs, perTokOtherB);

    const budgetA = sumU_A * gpu1.vramBytes; // capacity - implied reserve
    const budgetB = sumU_B * gpu2.vramBytes;
    const kvBudgetA = 0.98 * Math.max(0, budgetA - (wOtherA + kvOtherA) - wSelf);
    const kvBudgetB = 0.98 * Math.max(0, budgetB - (wOtherB + kvOtherB) - wSelf);

    const sugLenA = Math.floor(kvBudgetA / (perTokSelf * dSelf.maxNumSeqs));
    const sugLenB = Math.floor(kvBudgetB / (perTokSelf * dSelf.maxNumSeqs));
    const expLen = Math.max(0, Math.min(sugLenA, sugLenB));

    const sugSeqA = Math.floor(kvBudgetA / (perTokSelf * dSelf.maxModelLen));
    const sugSeqB = Math.floor(kvBudgetB / (perTokSelf * dSelf.maxModelLen));
    const expSeq = Math.max(0, Math.min(sugSeqA, sugSeqB));

    const s = computeDeploymentSuggestions(state, dSelf.id);
    expect(s.maxModelLen).toBe(expLen);
    expect(s.maxNumSeqs).toBe(expSeq);

    // Apply helpers update the deployment in place. Note these are sequential and
    // the second suggestion depends on the first update, so recompute expectations.
    applySuggestedMaxModelLen(state, dSelf.id);
    const afterLen = state.deployments.find(d => d.id === dSelf.id)!;
    expect(afterLen.maxModelLen).toBe(expLen);

    const s2 = computeDeploymentSuggestions(state, dSelf.id);
    applySuggestedMaxNumSeqs(state, dSelf.id);
    const afterSeq = state.deployments.find(d => d.id === dSelf.id)!;
    expect(afterSeq.maxNumSeqs).toBe(s2.maxNumSeqs);
  });
});

describe('controller: bars and fit status', () => {
  it('builds per-GPU bar segments that sum to capacity', () => {
    const state = baseState();
    const gpu = makeGpu('g1', 'G1', 80);
    state.gpus = [gpu];
    const model = makeModel();
    state.models = [model];
    const d1: Deployment = {
      id: 'd1', modelId: model.id, assignedGpuIds: ['g1'], tp: 1,
      weightDtype: 'bf16', kvDtype: 'fp16', kvOverheadPct: 0.1, replicationOverheadPct: 0.02,
      maxModelLen: 2048, maxNumSeqs: 2, utilizationShare: 0.6,
    };
    const d2: Deployment = {
      id: 'd2', modelId: model.id, assignedGpuIds: ['g1'], tp: 1,
      weightDtype: 'bf16', kvDtype: 'fp16', kvOverheadPct: 0.1, replicationOverheadPct: 0.02,
      maxModelLen: 1024, maxNumSeqs: 1, utilizationShare: 0.2,
    };
    state.deployments = [d1, d2];

    const bars = buildPerGpuBars(state);
    expect(bars).toHaveLength(1);
    const b = bars[0];
    const total = b.segments.reduce((sum, s) => sum + s.bytes, 0);
    expect(total).toBeCloseTo(b.capacityBytes, 6);
    // Should include weight and kv segments for both deployments + reserve + free
    const kinds = b.segments.map(s => s.kind);
    expect(kinds.filter(k => k === 'weights').length).toBeGreaterThan(0);
    expect(kinds.filter(k => k === 'kv').length).toBeGreaterThan(0);
    expect(kinds).toContain('reserve');
    expect(kinds).toContain('free');
  });

  it('fit status returns ok when under budget and error when no headroom', () => {
    const state = baseState();
    const gpu = makeGpu('g1', 'G1', 24);
    state.gpus = [gpu];
    const model = makeModel({ paramsB: 1 }); // smaller weights for first case
    state.models = [model];
    const under: Deployment = {
      id: 'under', modelId: model.id, assignedGpuIds: ['g1'], tp: 1,
      weightDtype: 'bf16', kvDtype: 'fp16', kvOverheadPct: 0.1, replicationOverheadPct: 0.02,
      maxModelLen: 512, maxNumSeqs: 1, utilizationShare: 0.9,
    };
    state.deployments = [under];
    const ok = buildPerGpuFitStatus(state);
    expect(ok[0].ok).toBe(true);
    expect(ok[0].free).toBeGreaterThan(0);

    // Now force no headroom by reducing utilization share drastically and increasing weights
    const heavyModel = makeModel({ id: 'm2', paramsB: 40 });
    state.models = [heavyModel];
    const over: Deployment = {
      id: 'over', modelId: 'm2', assignedGpuIds: ['g1'], tp: 1,
      weightDtype: 'bf16', kvDtype: 'fp16', kvOverheadPct: 0.1, replicationOverheadPct: 0.02,
      maxModelLen: 1024, maxNumSeqs: 1, utilizationShare: 0.2, // small allowed share
    };
    state.deployments = [over];
    const status = buildPerGpuFitStatus(state);
    expect(status[0].ok).toBe(false);
    expect(status[0].reason).toMatch(/Over capacity or no headroom/);
    expect(status[0].free).toBe(0);
  });
});

describe('controller: validation and selection', () => {
  it('validateDeployment returns error for tp > assigned and warning for mixed capacities', () => {
    const g1 = makeGpu('g#1', 'G#1', 24);
    const g2 = makeGpu('g#2', 'G#2', 48);
    const d: Deployment = {
      id: 'd', modelId: 'm1', assignedGpuIds: ['g#1', 'g#2'], tp: 3,
      weightDtype: 'bf16', kvDtype: 'fp16', kvOverheadPct: 0.1, replicationOverheadPct: 0.02,
      maxModelLen: 128, maxNumSeqs: 1,
    };
    const { errors, warnings } = validateDeployment(d, [g1, g2]);
    expect(errors).toContain('TP must be ≤ number of assigned GPUs');
    expect(warnings).toContain('Mixed GPU capacities in TP group');
  });

  it('setGpuCount/incrementGpu rebuild and clamp assignments/tp', () => {
    const state = baseState();
    // Catalog type
    state.gpuCatalog = [{ id: 'rtx', name: 'RTX 6000 Ada', vramBytes: GiB(48) }];
    // Start with 2 GPUs
    setGpuCount(state, 'rtx', 2);
    expect(state.gpus.map(g => g.id)).toEqual(['rtx#1', 'rtx#2']);
    // Add a deployment referencing a missing GPU id; tp too high
    const dep: Deployment = {
      id: 'dep', modelId: 'm', assignedGpuIds: ['rtx#1', 'rtx#3'], tp: 3,
      weightDtype: 'bf16', kvDtype: 'fp16', kvOverheadPct: 0.1, replicationOverheadPct: 0.02,
      maxModelLen: 128, maxNumSeqs: 1,
    };
    state.deployments = [dep];
    // Reduce to 1 GPU; should drop non-existent and clamp tp to 1
    setGpuCount(state, 'rtx', 1);
    expect(state.gpus.map(g => g.id)).toEqual(['rtx#1']);
    expect(state.deployments[0].assignedGpuIds).toEqual(['rtx#1']);
    expect(state.deployments[0].tp).toBe(1);
    // Increment back to 2
    incrementGpu(state, 'rtx', 1);
    expect(state.gpus.map(g => g.id)).toEqual(['rtx#1', 'rtx#2']);
  });
});

describe('controller: units and labels', () => {
  it('persists and loads unit preference via localStorage', () => {
    const state = baseState();
    // Minimal localStorage stub
    const store: Record<string, string> = {};
    const ls = {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { for (const k of Object.keys(store)) delete store[k]; },
      key: (_: number) => null,
      get length() { return Object.keys(store).length; },
    } as unknown as Storage;
    vi.stubGlobal('localStorage', ls);

    setUnit(state, 'GB');
    expect(state.unit).toBe('GB');

    // Reset and load
    const newState = baseState();
    vi.stubGlobal('localStorage', ls);
    loadUnitPreference(newState);
    expect(newState.unit).toBe('GB');
  });

  it('gpuCapacityLabel formats both GB and GiB to one decimal', () => {
    const g = makeGpu('g', 'G', 1); // 1 GiB
    // 1 GiB in bytes is ~1.073 GB, so label shows both
    const label = gpuCapacityLabel(g);
    expect(label).toMatch(/GB/);
    expect(label).toMatch(/GiB/);
    // Ensure one decimal place format
    const parts = label.match(/([0-9]+\.[0-9]) GB \(([0-9]+\.[0-9]) GiB\)/);
    expect(parts).not.toBeNull();
  });
});

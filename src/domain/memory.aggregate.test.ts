import { describe, it, expect } from 'vitest';
import { aggregatePerGpu, budgetBytesPerGpu, kvTotalBytesPerGpu } from '@domain/memory';
import type { Deployment, Gpu, Model } from '@shared/types';

describe('helpers used by aggregator', () => {
  it('budgetBytesPerGpu applies utilization and reserve', () => {
    const capacity = 80e9; // 80 GB (decimal)
    const U = 0.90;
    const reserve = 2e9; // 2 GB
    expect(budgetBytesPerGpu(capacity, U, reserve)).toBe(80e9 * 0.90 - 2e9);
  });

  it('kvTotalBytesPerGpu multiplies tokens by per-token bytes', () => {
    expect(kvTotalBytesPerGpu(100, 1024)).toBe(102400);
    expect(kvTotalBytesPerGpu(0, 1024)).toBe(0);
  });
});

describe('aggregatePerGpu', () => {
  const gpus: Gpu[] = [
    { id: 'A', name: 'GPU-A', vramBytes: 80e9 },
    { id: 'B', name: 'GPU-B', vramBytes: 40e9 },
  ];
  const models: Record<string, Model> = {
    M1: {
      id: 'M1',
      name: 'Model1',
      paramsB: 7,
      layers: 32,
      hiddenSize: 4096,
      heads: 32,
      numKeyValueHeads: 32,
      defaultWeightDtype: 'fp16',
      defaultKvDtype: 'fp16',
    },
    M2: {
      id: 'M2',
      name: 'Model2',
      paramsB: 0.5,
      layers: 24,
      hiddenSize: 2048,
      heads: 16,
      numKeyValueHeads: 8,
      defaultWeightDtype: 'fp16',
      defaultKvDtype: 'fp16',
    },
  };

  it('sums weights and KV across overlapping deployments and computes free', () => {
    const deployments: Deployment[] = [
      {
        id: 'D1',
        modelId: 'M1',
        assignedGpuIds: ['A', 'B'],
        tp: 2,
        weightDtype: 'fp16',
        kvDtype: 'fp16',
        kvOverheadPct: 0,
        replicationOverheadPct: 0,
        maxModelLen: 100,
        maxNumSeqs: 1,
      },
      {
        id: 'D2',
        modelId: 'M2',
        assignedGpuIds: ['A'],
        tp: 1,
        weightDtype: 'fp16',
        kvDtype: 'fp16',
        kvOverheadPct: 0,
        replicationOverheadPct: 0,
        maxModelLen: 50,
        maxNumSeqs: 2,
      },
    ];

    const U = 0.90;
    const reserve = 2e9;
    const perGpu = aggregatePerGpu(deployments, gpus, models, U, reserve);

    const A = perGpu.get('A');
    const B = perGpu.get('B');
    expect(A).toBeTruthy();
    expect(B).toBeTruthy();
    if (!A || !B) throw new Error('missing GPU results');

    // Expected numbers from analysis:
    // D1 on A: weights 7e9, kv 26,214,400 → 7,026,214,400
    // D2 on A: weights 1e9, kv 9,830,400 → 1,009,830,400
    // A used = 8,036,044,800; budget = 80e9*0.9 - 2e9 = 70e9; free = 61,963,955,200
    expect(A.used).toBe(8036044800);
    expect(A.parts.length).toBe(2);
    const partA_D1 = A.parts.find(p => p.deploymentId === 'D1');
    const partA_D2 = A.parts.find(p => p.deploymentId === 'D2');
    expect(partA_D1?.weights).toBe(7000000000);
    expect(partA_D1?.kv).toBe(26214400);
    expect(partA_D2?.weights).toBe(1000000000);
    expect(partA_D2?.kv).toBe(9830400);
    expect(A.free).toBe(61963955200);

    // GPU B has only D1
    // D1 on B: same as A for D1
    // B used = 7,026,214,400; budget = 40e9*0.9 - 2e9 = 34e9; free = 26,973,785,600
    expect(B.used).toBe(7026214400);
    expect(B.parts.length).toBe(1);
    const partB_D1 = B.parts[0];
    expect(partB_D1.deploymentId).toBe('D1');
    expect(partB_D1.weights).toBe(7000000000);
    expect(partB_D1.kv).toBe(26214400);
    expect(B.free).toBe(26973785600);
  });
});


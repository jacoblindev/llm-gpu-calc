import { describe, it, expect, afterEach, vi } from 'vitest';
afterEach(() => {
  vi.unstubAllGlobals();
});
import { fitChecks } from '@domain/memory';

function mkMap(entries: Array<[string, { used: number; free: number; parts: Array<{deploymentId: string; weights: number; kv: number}> }]> ) {
  return new Map<string, { used: number; free: number; parts: Array<{deploymentId: string; weights: number; kv: number}> }>(entries);
}

describe('fitChecks', () => {
  it('flags over capacity or no headroom when free <= 0', () => {
    const perGpu = mkMap([
      ['G1', { used: 101, free: 0, parts: [{ deploymentId: 'D', weights: 100, kv: 1 }] }],
    ]);
    const res = fitChecks(perGpu);
    expect(res).toHaveLength(1);
    expect(res[0].gpuId).toBe('G1');
    expect(res[0].ok).toBe(false);
    expect(res[0].reason).toMatch(/Over capacity|no headroom/);
  });

  it('warns on high utilization >95%', () => {
    const perGpu = mkMap([
      ['G1', { used: 96, free: 4, parts: [{ deploymentId: 'D', weights: 96, kv: 0 }] }], // 96/100
    ]);
    const res = fitChecks(perGpu);
    expect(res[0].ok).toBe(true);
    expect(res[0].reason).toMatch(/High utilization/);
  });

  it('fails minimal KV viability when a deployment has weights but zero KV', () => {
    const perGpu = mkMap([
      ['G1', { used: 1000, free: 9000, parts: [
        { deploymentId: 'D1', weights: 1000, kv: 0 },
      ] }],
    ]);
    const res = fitChecks(perGpu);
    expect(res[0].ok).toBe(false);
    expect(res[0].reason).toMatch(/Minimal KV/);
  });
});

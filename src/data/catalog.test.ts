import { describe, it, expect, afterEach, vi } from 'vitest';
afterEach(() => {
  vi.unstubAllGlobals();
});
import { listModels, getModelById, listGpus } from './catalog';

describe('data/catalog models (2.1)', () => {
  it('loads models with numKeyValueHeads present', () => {
    const models = listModels();
    expect(models.length).toBeGreaterThanOrEqual(3);

    const llama = getModelById('meta-llama/Llama-3.1-8B-Instruct');
    const gemma = getModelById('google/gemma-3-27b-it');
    const phi = getModelById('microsoft/phi-4');

    for (const m of [llama, gemma, phi]) {
      expect(m).toBeDefined();
      expect(m!.numKeyValueHeads).toBeGreaterThan(0);
      expect(Number.isInteger(m!.numKeyValueHeads)).toBe(true);
      // sanity: heads must be divisible by numKeyValueHeads
      expect(m!.heads % m!.numKeyValueHeads).toBe(0);
      // sanity: hiddenSize divisible by heads
      expect(m!.hiddenSize % m!.heads).toBe(0);
    }
  });
});

describe('data/catalog gpus (2.2)', () => {
  it('loads GPUs with capacities as bytes and distinct variants', () => {
    const gpus = listGpus();
    const byId = (id: string) => gpus.find((g) => g.id === id);

    expect(byId('a100-80gb')?.vramBytes).toBe(80_000_000_000);
    expect(byId('a100-40gb')?.vramBytes).toBe(40_000_000_000);
    expect(byId('rtx-6000-ada-48gb')?.vramBytes).toBe(48_000_000_000);
    expect(byId('rtx-a6000-48gb')?.vramBytes).toBe(48_000_000_000);
    expect(byId('h200-141gb')?.vramBytes).toBe(141_000_000_000);

    // ensure variants are distinct ids
    expect(byId('a100-80gb')).toBeDefined();
    expect(byId('a100-40gb')).toBeDefined();
  });
});

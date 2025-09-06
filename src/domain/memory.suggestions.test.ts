import { describe, it, expect } from 'vitest';
import { suggestMaxModelLen, suggestMaxNumSeq } from '@domain/memory';

describe('suggestMaxModelLen', () => {
  it('computes suggested tokens for a given budget and numSeq', () => {
    const budget = 1_000_000_000; // 1e9 bytes
    const kvPerTok = 1_000_000; // 1 MB per token per GPU
    const numSeq = 2;
    // floor(1e9 / (1e6 * 2)) = floor(500) = 500
    expect(suggestMaxModelLen(budget, kvPerTok, numSeq)).toBe(500);
  });

  it('returns 0 for non-positive inputs', () => {
    expect(suggestMaxModelLen(0, 100, 1)).toBe(0);
    expect(suggestMaxModelLen(1000, 0, 1)).toBe(0);
    expect(suggestMaxModelLen(1000, 1, 0)).toBe(0);
  });
});

describe('suggestMaxNumSeq', () => {
  it('computes suggested sequences for a given budget and modelLen', () => {
    const budget = 1_000_000_000; // 1e9 bytes
    const kvPerTok = 1024; // 1 KiB per token per GPU
    const modelLen = 1000; // tokens
    // floor(1e9 / (1024 * 1000)) = floor(976.5625) = 976
    expect(suggestMaxNumSeq(budget, kvPerTok, modelLen)).toBe(976);
  });

  it('returns 0 for non-positive inputs', () => {
    expect(suggestMaxNumSeq(0, 100, 1)).toBe(0);
    expect(suggestMaxNumSeq(1000, 0, 1)).toBe(0);
    expect(suggestMaxNumSeq(1000, 1, 0)).toBe(0);
  });
});


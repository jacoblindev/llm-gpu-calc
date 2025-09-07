import { describe, it, expect, afterEach, vi } from 'vitest';
afterEach(() => {
  vi.unstubAllGlobals();
});
import { bytesPerParam, weightBytesPerGpu } from '@domain/memory';

describe('bytesPerParam (weights)', () => {
  it('maps weight dtypes to bytes', () => {
    expect(bytesPerParam('fp32')).toBe(4);
    expect(bytesPerParam('fp16')).toBe(2);
    expect(bytesPerParam('bf16')).toBe(2);
    expect(bytesPerParam('q8')).toBe(1);
    expect(bytesPerParam('q4')).toBe(0.5);
  });
});

describe('weightBytesPerGpu', () => {
  it('computes per-GPU bytes with tp=1 and no overhead', () => {
    const paramsB = 7; // 7B params
    const bytes = weightBytesPerGpu(paramsB, 'fp16', 1, 0);
    // 7e9 * 2 bytes = 14e9
    expect(bytes).toBe(14e9);
  });

  it('scales by dtype (fp32 is double fp16)', () => {
    const paramsB = 1;
    const fp16 = weightBytesPerGpu(paramsB, 'fp16', 1, 0);
    const fp32 = weightBytesPerGpu(paramsB, 'fp32', 1, 0);
    expect(fp32).toBe(fp16 * 2);
  });

  it('divides by tensor parallel degree', () => {
    const paramsB = 70; // 70B
    const tp1 = weightBytesPerGpu(paramsB, 'fp16', 1, 0);
    const tp2 = weightBytesPerGpu(paramsB, 'fp16', 2, 0);
    const tp5 = weightBytesPerGpu(paramsB, 'fp16', 5, 0);
    expect(tp2).toBeCloseTo(tp1 / 2, 6);
    expect(tp5).toBeCloseTo(tp1 / 5, 6);
  });

  it('applies replication overhead percentage', () => {
    const base = weightBytesPerGpu(13, 'fp16', 1, 0); // 13e9 * 2 = 26e9
    const with2pct = weightBytesPerGpu(13, 'fp16', 1, 0.02);
    expect(with2pct).toBeCloseTo(base * 1.02, 6);
  });

  it('returns 0 for invalid tp', () => {
    expect(weightBytesPerGpu(7, 'fp16', 0, 0.02)).toBe(0);
    expect(weightBytesPerGpu(7, 'fp16', -1, 0.02)).toBe(0);
  });
});

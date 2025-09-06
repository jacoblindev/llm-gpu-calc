import { describe, it, expect } from 'vitest';
import { bytesPerKvElem, kvBytesPerTokenPerGpu } from '@domain/memory';

describe('bytesPerKvElem', () => {
  it('maps kv dtypes to byte sizes', () => {
    expect(bytesPerKvElem('fp16')).toBe(2);
    expect(bytesPerKvElem('bf16')).toBe(2);
    expect(bytesPerKvElem('fp8')).toBe(1);
    expect(bytesPerKvElem('int8')).toBe(1);
  });
});

describe('kvBytesPerTokenPerGpu (GQA-aware)', () => {
  it('computes per-token bytes for MHA (numKV=heads) in fp16', () => {
    const layers = 32;
    const hidden = 4096;
    const heads = 32;
    const numKV = 32; // MHA: KV heads = attention heads
    const tp = 1;
    const overhead = 0;
    const perTok = kvBytesPerTokenPerGpu(layers, hidden, heads, numKV, 'fp16', tp, overhead);
    // 2 * L * numKV * (hidden/heads) * bytes(fp16)
    // 2 * 32 * 32 * 128 * 2 = 524288 bytes
    expect(perTok).toBe(524288);
  });

  it('scales with GQA (numKV < heads)', () => {
    const layers = 32;
    const hidden = 4096;
    const heads = 32;
    const numKV = 8; // GQA groups
    const tp = 1;
    const overhead = 0;
    const perTok = kvBytesPerTokenPerGpu(layers, hidden, heads, numKV, 'fp16', tp, overhead);
    // 1/4 of MHA case above
    expect(perTok).toBe(131072);
  });

  it('halves for 1-byte kv dtypes (fp8/int8)', () => {
    const layers = 32;
    const hidden = 4096;
    const heads = 32;
    const numKV = 32;
    const tp = 1;
    const overhead = 0;
    const fp16 = kvBytesPerTokenPerGpu(layers, hidden, heads, numKV, 'fp16', tp, overhead);
    const fp8 = kvBytesPerTokenPerGpu(layers, hidden, heads, numKV, 'fp8', tp, overhead);
    const int8 = kvBytesPerTokenPerGpu(layers, hidden, heads, numKV, 'int8', tp, overhead);
    expect(fp16 / 2).toBe(fp8);
    expect(fp8).toBe(int8);
  });

  it('divides by tp', () => {
    const layers = 32;
    const hidden = 4096;
    const heads = 32;
    const numKV = 32;
    const perTokTp1 = kvBytesPerTokenPerGpu(layers, hidden, heads, numKV, 'fp16', 1, 0);
    const perTokTp2 = kvBytesPerTokenPerGpu(layers, hidden, heads, numKV, 'fp16', 2, 0);
    expect(perTokTp2).toBe(perTokTp1 / 2);
  });

  it('applies overhead percentage', () => {
    const layers = 32;
    const hidden = 4096;
    const heads = 32;
    const numKV = 8;
    const base = kvBytesPerTokenPerGpu(layers, hidden, heads, numKV, 'fp16', 1, 0);
    const withOverhead = kvBytesPerTokenPerGpu(layers, hidden, heads, numKV, 'fp16', 1, 0.10);
    expect(withOverhead).toBeCloseTo(base * 1.1, 6);
  });
});


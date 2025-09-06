import type { DType, Deployment, Gpu, KvDType, Model } from '@shared/types';

export function bytesPerParam(_dtype: DType): number {
  switch (_dtype) {
    case 'fp32':
      return 4;
    case 'fp16':
    case 'bf16':
      return 2;
    case 'q8':
      return 1;
    case 'q4':
      return 0.5;
    default:
      return 0;
  }
}

export function bytesPerKvElem(_dtype: KvDType): number {
  switch (_dtype) {
    case 'fp16':
    case 'bf16':
      return 2;
    case 'fp8':
    case 'int8':
      return 1;
    default:
      return 0;
  }
}

export function weightBytesPerGpu(
  _paramsB: number,
  _dtype: DType,
  _tp: number,
  _replicationOverheadPct: number,
): number {
  return 0;
}

export function kvBytesPerTokenPerGpu(
  _layers: number,
  _hidden: number,
  _heads: number,
  _numKeyValueHeads: number,
  _kvDtype: KvDType,
  _tp: number,
  _kvOverheadPct: number,
): number {
  if (_tp <= 0 || _heads <= 0) return 0;
  const headDim = _hidden / _heads;
  const bytes = bytesPerKvElem(_kvDtype);
  const base = 2 * _layers * _numKeyValueHeads * headDim * bytes;
  const perGpu = base / _tp;
  return perGpu * (1 + _kvOverheadPct);
}

export function budgetBytesPerGpu(
  _capacityBytes: number,
  _utilization: number,
  _reserveBytes: number,
): number {
  return 0;
}

export function kvTotalBytesPerGpu(
  _tokensTotal: number,
  _perTokBytesPerGpu: number,
): number {
  return 0;
}

export function aggregatePerGpu(
  _deployments: Deployment[],
  _gpus: Gpu[],
  _models: Record<string, Model>,
  _utilization: number,
  _reserveBytes: number,
): Map<string, { used: number; free: number; parts: Array<{ deploymentId: string; weights: number; kv: number }> }> {
  return new Map();
}

export function suggestMaxModelLen(
  _budgetBytes: number,
  _kvPerTokenPerGpu: number,
  _numSeq: number,
): number {
  return 0;
}

export function suggestMaxNumSeq(
  _budgetBytes: number,
  _kvPerTokenPerGpu: number,
  _modelLen: number,
): number {
  return 0;
}

export function fitChecks(
  _perGpu: Map<string, { used: number; free: number; parts: Array<{ deploymentId: string; weights: number; kv: number }> }>,
): Array<{ gpuId: string; ok: boolean; reason?: string }> {
  return [];
}

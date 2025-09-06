import type { DType, Deployment, Gpu, KvDType, Model } from '@shared/types';

export function bytesPerParam(_dtype: DType): number {
  return 0;
}

export function bytesPerKvElem(_dtype: KvDType): number {
  return 0;
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
  return 0;
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

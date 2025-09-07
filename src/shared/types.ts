export type UnitPreference = 'GiB' | 'GB';

export type DType = 'fp16' | 'bf16' | 'fp32' | 'q8' | 'q4';
export type KvDType = 'fp16' | 'bf16' | 'fp8' | 'int8';

export interface Gpu {
  id: string;
  name: string;
  vramBytes: number;
  vendor?: string;
}

export interface Model {
  id: string;
  name: string;
  paramsB: number;
  layers: number;
  hiddenSize: number;
  heads: number;
  numKeyValueHeads: number;
  defaultWeightDtype: DType;
  defaultKvDtype: KvDType;
}

export interface Deployment {
  id: string;
  modelId: string;
  assignedGpuIds: string[];
  tp: number;
  weightDtype: DType;
  kvDtype: KvDType;
  kvOverheadPct: number;
  replicationOverheadPct: number;
  maxModelLen: number;
  maxNumSeqs: number;
  utilizationShare?: number; // fraction [0..1] of per-GPU capacity allocated to this deployment
}

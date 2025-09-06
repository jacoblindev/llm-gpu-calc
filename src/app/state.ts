import type { Deployment, Gpu, Model, UnitPreference } from '@shared/types';

export interface AppState {
  gpus: Gpu[];
  models: Model[];
  deployments: Deployment[];
  utilization: number; // U in [0,1]
  reserveBytes: number; // per GPU
  unit: UnitPreference;
}

export function createInitialState(): AppState {
  return {
    gpus: [],
    models: [],
    deployments: [],
    utilization: 0.9,
    reserveBytes: 2 * 1024 * 1024 * 1024,
    unit: 'GiB',
  };
}

import type { Gpu, Model } from '@shared/types';
import modelsJson from './models.json';
import gpusJson from './gpus.json';

export function listGpus(): Gpu[] {
  return (gpusJson as unknown as Gpu[]).filter((g) =>
    !!g && typeof g.id === 'string' && typeof g.name === 'string' && typeof g.vramBytes === 'number'
  );
}

export function listModels(): Model[] {
  // Minimal validation: ensure required fields exist on each entry
  return (modelsJson as unknown as Model[]).filter((m) =>
    !!m && typeof m.id === 'string' && typeof m.name === 'string' &&
    typeof m.paramsB === 'number' && typeof m.layers === 'number' &&
    typeof m.hiddenSize === 'number' && typeof m.heads === 'number' &&
    typeof m.numKeyValueHeads === 'number' &&
    typeof m.defaultWeightDtype === 'string' && typeof m.defaultKvDtype === 'string'
  );
}

export function getModelById(id: string): Model | undefined {
  return listModels().find((m) => m.id === id);
}

import { describe, it, expect } from 'vitest'
import { createInitialState, type AppState } from '@app/state'
import { buildPerGpuBars, buildPerGpuBarsWithOverrides, type DeploymentOverride } from '@app/controller'
import type { Deployment, Gpu, Model } from '@shared/types'

function GiB(n: number): number { return n * 1024 ** 3 }
function makeGpu(id: string, name: string, vramGiB: number): Gpu { return { id, name, vramBytes: GiB(vramGiB) } }
function makeModel(): Model {
  return {
    id: 'm', name: 'M-7B', paramsB: 7, layers: 32, hiddenSize: 4096, heads: 32, numKeyValueHeads: 8,
    defaultWeightDtype: 'bf16', defaultKvDtype: 'fp16',
  }
}

describe('app/controller: preview overrides adjust + apply', () => {
  it('recomputes bars with temporary overrides, then matches after apply', () => {
    const state: AppState = createInitialState()
    const model = makeModel()
    state.models = [model]
    const gpu = makeGpu('g1', 'G1', 80)
    state.gpus = [gpu]
    const d: Deployment = {
      id: 'd1', modelId: model.id, assignedGpuIds: ['g1'], tp: 1,
      weightDtype: 'bf16', kvDtype: 'fp16', kvOverheadPct: 0.1, replicationOverheadPct: 0.02,
      maxModelLen: 1024, maxNumSeqs: 1, utilizationShare: 0.9,
    }
    state.deployments = [d]

    const base = buildPerGpuBars(state)
    const o: DeploymentOverride[] = [{ id: 'd1', maxNumSeqs: 4 }]
    const adjusted = buildPerGpuBarsWithOverrides(state, o)

    // kv usage should increase when seqs increase
    const baseKv = base[0].segments.filter(s => s.kind === 'kv').reduce((a, s) => a + s.bytes, 0)
    const adjKv = adjusted[0].segments.filter(s => s.kind === 'kv').reduce((a, s) => a + s.bytes, 0)
    expect(adjKv).toBeGreaterThan(baseKv)

    // State not mutated yet
    expect(state.deployments[0].maxNumSeqs).toBe(1)

    // Apply to state and recompute; should match adjusted
    state.deployments[0].maxNumSeqs = 4
    const after = buildPerGpuBars(state)
    const afterKv = after[0].segments.filter(s => s.kind === 'kv').reduce((a, s) => a + s.bytes, 0)
    expect(afterKv).toBe(adjKv)
  })
})


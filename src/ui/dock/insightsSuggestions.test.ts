import { describe, expect, it, vi, beforeEach } from 'vitest'
import { buildInsightSuggestions } from './insightsSuggestions'
import type { AppState } from '@app/state'
import { createInitialState } from '@app/state'
import type { Deployment, Model } from '@shared/types'

vi.mock('@app/controller', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@app/controller')>()
  return {
    ...actual,
    computeDeploymentSuggestions: vi.fn(),
  }
})

import { computeDeploymentSuggestions } from '@app/controller'

function makeState(): AppState {
  const base = createInitialState()
  const models: Model[] = [
    {
      id: 'm1',
      name: 'Model One',
      paramsB: 10,
      layers: 20,
      hiddenSize: 4096,
      heads: 32,
      numKeyValueHeads: 8,
      defaultWeightDtype: 'bf16',
      defaultKvDtype: 'fp16',
    },
  ]
  const deployments: Deployment[] = [
    {
      id: 'dep-1',
      modelId: 'm1',
      assignedGpuIds: [],
      tp: 1,
      weightDtype: 'bf16',
      kvDtype: 'fp16',
      kvOverheadPct: 0.1,
      replicationOverheadPct: 0.02,
      maxModelLen: 4096,
      maxNumSeqs: 1,
    },
    {
      id: 'dep-2',
      modelId: 'm1',
      assignedGpuIds: [],
      tp: 1,
      weightDtype: 'bf16',
      kvDtype: 'fp16',
      kvOverheadPct: 0.1,
      replicationOverheadPct: 0.02,
      maxModelLen: 2048,
      maxNumSeqs: 2,
    },
  ]
  return { ...base, models, deployments }
}

describe('buildInsightSuggestions', () => {
  beforeEach(() => {
    vi.mocked(computeDeploymentSuggestions).mockImplementation((state, id) => {
      if (id === 'dep-1') {
        return { maxModelLen: 8192, maxNumSeqs: 4 }
      }
      if (id === 'dep-2') {
        return { maxModelLen: 2048, maxNumSeqs: 2 }
      }
      return { maxModelLen: 0, maxNumSeqs: 0 }
    })
  })

  it('returns actionable suggestions sorted by impact', () => {
    const state = makeState()
    const rows = buildInsightSuggestions({ state })
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe('dep-1')
    expect(rows[0].actions).toHaveLength(2)
    const [len, seqs] = rows[0].actions
    expect(len.field).toBe('max_model_len')
    expect(len.canApply).toBe(true)
    expect(len.suggested).toBe(8192)
    expect(seqs.field).toBe('max_num_seqs')
    expect(seqs.delta).toBe(3)
  })

  it('skips deployments without actionable deltas', () => {
    const state = makeState()
    vi.mocked(computeDeploymentSuggestions).mockImplementation((s, id) => {
      const deployment = s.deployments.find((d) => d.id === id)
      return {
        maxModelLen: deployment?.maxModelLen ?? 0,
        maxNumSeqs: deployment?.maxNumSeqs ?? 0,
      }
    })
    const rows = buildInsightSuggestions({ state })
    expect(rows).toHaveLength(0)
  })
})

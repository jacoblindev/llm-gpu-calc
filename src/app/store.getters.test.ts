import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAppStore } from './store'
import type { AppState } from './state'
import { computeResultsStub, buildPerGpuBars, buildPerGpuFitStatus } from './controller'

function asAppState(s: unknown): AppState {
  return s as AppState
}

describe('useAppStore getters delegate to controller', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('resultsStub / perGpuBars / fitStatus match controller outputs and are deterministic', () => {
    const store = useAppStore()
    store.init()

    // Ensure at least one GPU and one deployment assigned to generate non-trivial outputs
    const typeId = store.gpuCatalog[0]?.id
    expect(typeId).toBeTruthy()
    if (!typeId) return
    store.setGpuCount(typeId, 1)
    store.addDeployment()
    const gpuId = store.gpus[0]?.id
    expect(gpuId).toBeTruthy()
    if (!gpuId) return
    const dep = store.deployments[0]
    dep.assignedGpuIds = [gpuId]
    dep.modelId = store.models[0]?.id ?? ''

    const state = asAppState(store)

    const r1 = store.resultsStub
    const r2 = computeResultsStub(state)
    expect(r1).toEqual(r2)

    const b1 = store.perGpuBars
    const b2 = buildPerGpuBars(state)
    expect(b1).toEqual(b2)

    const f1 = store.fitStatus
    const f2 = buildPerGpuFitStatus(state)
    expect(f1).toEqual(f2)

    // Determinism: unrelated viewPref changes do not affect outputs
    const snapshot = JSON.stringify({ r1, b1, f1 })
    store.setDensity('20x20')
    const snapshot2 = JSON.stringify({ r1: store.resultsStub, b1: store.perGpuBars, f1: store.fitStatus })
    expect(snapshot2).toEqual(snapshot)
  })
})


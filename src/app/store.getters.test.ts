import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAppStore } from './store'
import type { AppState } from './state'
import { computeResultsStub, buildPerGpuBars, buildPerGpuFitStatus, buildPerGpuWaffleCells } from './controller'

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

    const w1 = store.waffleCells
    const w2 = buildPerGpuWaffleCells(state, 10)
    expect(w1).toEqual(w2)

    // Determinism: unrelated viewPref changes do not affect outputs
    const snapshot = JSON.stringify({ r1, b1, f1 })
    store.setDensity('20x20')
    const stateAfter = asAppState(store)
    const w3 = store.waffleCells
    const w4 = buildPerGpuWaffleCells(stateAfter, 20)
    expect(w3).toEqual(w4)

    const snapshot2 = JSON.stringify({ r1: store.resultsStub, b1: store.perGpuBars, f1: store.fitStatus })
    expect(snapshot2).toEqual(snapshot)
  })

  it('auto-downgrades density to 10x10 when GPU count is high', () => {
    const store = useAppStore()
    store.init()
    const typeId = store.gpuCatalog[0]?.id
    expect(typeId).toBeTruthy()
    if (!typeId) return

    store.setDensity('20x20')
    store.setGpuCount(typeId, 40)

    expect(store.viewPrefs.density).toBe('20x20')
    expect(store.effectiveDensity).toBe('10x10')
    const cells = store.waffleCells
    expect(cells.every((entry: any) => entry.gridSize === 10)).toBe(true)
  })
})

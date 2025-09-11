import { describe, it, expect } from 'vitest'
import { createInitialState, type AppState } from '@app/state'
import { shouldShowPreview, setGpuCount } from '@app/controller'

function GiB(n: number): number { return n * 1024 ** 3 }

describe('app: preview visibility', () => {
  it('is hidden when no GPUs are selected', () => {
    const state: AppState = createInitialState()
    // No GPUs selected by default
    expect(shouldShowPreview(state)).toBe(false)
  })

  it('appears after selecting the first GPU and hides when removed', () => {
    const state: AppState = createInitialState()
    // Seed a catalog type so setGpuCount can create instances
    state.gpuCatalog = [{ id: 'rtx', name: 'RTX 6000 Ada', vramBytes: GiB(48) }]

    setGpuCount(state, 'rtx', 1)
    expect(state.gpus.length).toBe(1)
    expect(shouldShowPreview(state)).toBe(true)

    setGpuCount(state, 'rtx', 0)
    expect(state.gpus.length).toBe(0)
    expect(shouldShowPreview(state)).toBe(false)
  })
})

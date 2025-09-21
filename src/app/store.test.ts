import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAppStore } from './store'

describe('useAppStore (basic)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes catalogs on init()', () => {
    const store = useAppStore()
    expect(store.gpuCatalog.length).toBe(0)
    expect(store.models.length).toBe(0)
    store.init()
    expect(store.gpuCatalog.length).toBeGreaterThan(0)
    expect(store.models.length).toBeGreaterThan(0)
  })

  it('sets and increments GPU counts and rebuilds selected GPUs', () => {
    const store = useAppStore()
    store.init()
    const typeId = store.gpuCatalog[0]?.id
    expect(typeId).toBeTruthy()
    if (!typeId) return
    store.setGpuCount(typeId, 2)
    expect(store.gpuCounts[typeId]).toBe(2)
    expect(store.gpus.filter(g => g.id.startsWith(typeId)).length).toBe(2)
    store.incrementGpu(typeId, 1)
    expect(store.gpuCounts[typeId]).toBe(3)
    expect(store.gpus.filter(g => g.id.startsWith(typeId)).length).toBe(3)
  })

  it('adds and removes deployments', () => {
    const store = useAppStore()
    store.init()
    const before = store.deployments.length
    store.addDeployment()
    expect(store.deployments.length).toBe(before + 1)
    const id = store.deployments[store.deployments.length - 1].id
    store.removeDeployment(id)
    expect(store.deployments.some(d => d.id === id)).toBe(false)
  })
})


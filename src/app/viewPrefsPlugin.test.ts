import { describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAppStore } from './store'

function setupStore() {
  setActivePinia(createPinia())
  const store = useAppStore()
  store.init()
  return store
}

describe('viewPrefs interactions', () => {
  it('updates sort preference via setSort action', () => {
    const store = setupStore()
    expect(store.viewPrefs.sort).toBe('status_used')
    store.setSort('used_desc')
    expect(store.viewPrefs.sort).toBe('used_desc')
  })

  it('updates status filter and density', () => {
    const store = setupStore()
    store.setStatusFilter('warn')
    expect(store.viewPrefs.statusFilter).toBe('warn')
    store.setDensity('20x20')
    expect(store.viewPrefs.density).toBe('20x20')
  })

  it('updates vendor filter and search', () => {
    const store = setupStore()
    store.setVendorFilter('NVIDIA')
    expect(store.viewPrefs.vendorFilter).toBe('NVIDIA')
    store.setSearch('A100')
    expect(store.viewPrefs.search).toBe('A100')
  })
})

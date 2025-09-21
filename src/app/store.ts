import { defineStore } from 'pinia'
import type { AppState } from './state'
import { createInitialState } from './state'
import {
  init as initController,
  loadUnitPreference as loadUnitPreferenceController,
  setUnit as setUnitController,
  setGpuCount as setGpuCountController,
  incrementGpu as incrementGpuController,
  addDeployment as addDeploymentController,
  removeDeployment as removeDeploymentController,
  computeResultsStub,
  buildPerGpuBars,
  buildPerGpuFitStatus,
  buildPerGpuWaffleCells,
  applySuggestedMaxModelLen as applySuggestedMaxModelLenController,
  applySuggestedMaxNumSeqs as applySuggestedMaxNumSeqsController,
} from './controller'
import type { UnitPreference } from '@shared/types'
import {
  defaultViewPrefs,
  parseFromURL,
  loadFromLocalStorage,
  persistToLocalStorage,
  applyToURL,
} from './viewPrefs'

export type Density = '10x10' | '20x20'

export interface ViewPrefs {
  density: Density
  sort: string
  statusFilter: string
  vendorFilter: string
  search: string
}

export interface StoreState extends AppState {
  viewPrefs: ViewPrefs
}

// Auto-downgrade waffle density when GPU count exceeds this threshold.
// Derived from usability testing: 20×20 tiles past 32 GPUs cause perceptible jank.
export const AUTO_DOWNGRADE_GPU_THRESHOLD = 32

function computeEffectiveDensity(state: StoreState): Density {
  const desired = state.viewPrefs?.density ?? '10x10'
  const gpuCount = state.gpus?.length ?? 0
  if (desired === '20x20' && gpuCount >= AUTO_DOWNGRADE_GPU_THRESHOLD) {
    return '10x10'
  }
  return desired
}

export const useAppStore = defineStore('app', {
  state: (): StoreState => ({
    ...createInitialState(),
    viewPrefs: { ...defaultViewPrefs },
  }),

  getters: {
    effectiveDensity: (state): Density => computeEffectiveDensity(state),
    resultsStub: (state): ReturnType<typeof computeResultsStub> => {
      return computeResultsStub(state)
    },
    perGpuBars: (state) => {
      return buildPerGpuBars(state)
    },
    fitStatus: (state) => {
      return buildPerGpuFitStatus(state)
    },
    waffleCells: (state) => {
      const density = computeEffectiveDensity(state)
      const gridSize = density === '20x20' ? 20 : 10
      return buildPerGpuWaffleCells(state, gridSize)
    },
    kpis: (state) => {
      const results = computeResultsStub(state)
      const fitEntries = buildPerGpuFitStatus(state)
      const fit = new Map(fitEntries.map((entry) => [entry.gpuId, entry]))
      let totalCapacity = 0
      let totalUsed = 0
      let totalReserve = 0
      let warnings = 0
      for (const r of results) {
        totalCapacity += r.capacityBytes
        totalUsed += Math.max(0, r.usedBytes)
        totalReserve += Math.max(0, r.impliedReserveFrac * r.capacityBytes)
        const f = fit.get(r.gpuId)
        if (f && !f.ok) warnings += 1
      }
      return {
        gpus: results.length,
        totalCapacity,
        totalUsed,
        totalReserve,
        warnings,
      }
    },
  },

  actions: {
    init() {
      initController(this.$state)
    },
    loadUnitPreference() {
      loadUnitPreferenceController(this.$state)
    },
    setUnit(unit: UnitPreference) {
      setUnitController(this.$state, unit)
    },
    setGpuCount(typeId: string, n: number) {
      setGpuCountController(this.$state, typeId, n)
    },
    incrementGpu(typeId: string, delta: number) {
      incrementGpuController(this.$state, typeId, delta)
    },
    addDeployment() {
      addDeploymentController(this.$state)
    },
    removeDeployment(id: string) {
      removeDeploymentController(this.$state, id)
    },
    applySuggestedMaxModelLen(id: string) {
      applySuggestedMaxModelLenController(this.$state, id)
    },
    applySuggestedMaxNumSeqs(id: string) {
      applySuggestedMaxNumSeqsController(this.$state, id)
    },
    setDensity(density: Density) {
      this.viewPrefs.density = density
    },
    setSort(sort: string) {
      this.viewPrefs.sort = sort
    },
    setStatusFilter(status: string) {
      this.viewPrefs.statusFilter = status
    },
    setVendorFilter(vendor: string) {
      this.viewPrefs.vendorFilter = vendor
    },
    setSearch(q: string) {
      this.viewPrefs.search = q
    },

    /**
     * Starts syncing viewPrefs with URL query params and localStorage.
     * - On start, read URL first, then localStorage for any missing values.
     * - On changes, persist to both and update the URL with replaceState.
     */
    startViewPrefsSync() {
      // initialize from URL, then fill gaps from localStorage
      try {
        const fromUrl = parseFromURL(window.location.search)
        this.viewPrefs = {
          ...defaultViewPrefs,
          ...loadFromLocalStorage(),
          ...fromUrl,
        }
        // write back normalized params
        const query = applyToURL(window.location.search, this.viewPrefs)
        const newUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
        window.history.replaceState(null, '', newUrl)
      } catch {}

      // subscribe to store changes and persist only when viewPrefs actually changed
      let last = ''
      const snapshot = (vp: ViewPrefs) => JSON.stringify(vp)
      last = snapshot(this.viewPrefs)

      this.$subscribe(() => {
        const next = snapshot(this.viewPrefs)
        if (next === last) return
        last = next
        // persist to LS
        persistToLocalStorage(this.viewPrefs)
        // update URL
        try {
          const query = applyToURL(window.location.search, this.viewPrefs)
          const newUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
          window.history.replaceState(null, '', newUrl)
        } catch {}
      }, { detached: true })
    },
  },
})

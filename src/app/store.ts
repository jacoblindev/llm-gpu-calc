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

type StoreState = AppState & { viewPrefs: ViewPrefs }

export const useAppStore = defineStore('app', {
  state: (): StoreState => ({
    ...createInitialState(),
    viewPrefs: { ...defaultViewPrefs },
  }),

  getters: {
    resultsStub(state): ReturnType<typeof computeResultsStub> {
      // Cast to AppState shape for controller helpers
      return computeResultsStub(state as unknown as AppState)
    },
    perGpuBars(state) {
      return buildPerGpuBars(state as unknown as AppState)
    },
    fitStatus(state) {
      return buildPerGpuFitStatus(state as unknown as AppState)
    },
    kpis(state) {
      const results = computeResultsStub(state as unknown as AppState)
      const fit = new Map(this.fitStatus.map((f: any) => [f.gpuId, f]))
      let totalCapacity = 0
      let totalUsed = 0
      let totalReserve = 0
      let warnings = 0
      for (const r of results) {
        totalCapacity += r.capacityBytes
        totalUsed += Math.max(0, r.usedBytes)
        totalReserve += Math.max(0, r.impliedReserveFrac * r.capacityBytes)
        const f = fit.get(r.gpuId)
        if (f && (f.ok === false)) warnings += 1
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
      initController(this as unknown as AppState)
    },
    loadUnitPreference() {
      loadUnitPreferenceController(this as unknown as AppState)
    },
    setUnit(unit: UnitPreference) {
      setUnitController(this as unknown as AppState, unit)
    },
    setGpuCount(typeId: string, n: number) {
      setGpuCountController(this as unknown as AppState, typeId, n)
    },
    incrementGpu(typeId: string, delta: number) {
      incrementGpuController(this as unknown as AppState, typeId, delta)
    },
    addDeployment() {
      addDeploymentController(this as unknown as AppState)
    },
    removeDeployment(id: string) {
      removeDeploymentController(this as unknown as AppState, id)
    },
    applySuggestedMaxModelLen(id: string) {
      applySuggestedMaxModelLenController(this as unknown as AppState, id)
    },
    applySuggestedMaxNumSeqs(id: string) {
      applySuggestedMaxNumSeqsController(this as unknown as AppState, id)
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

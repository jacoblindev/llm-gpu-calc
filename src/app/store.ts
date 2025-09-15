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

export type Density = '10x10' | '20x20'

export interface ViewPrefs {
  density: Density
  // Future: sort/filter/search configuration lives here
}

type StoreState = AppState & { viewPrefs: ViewPrefs }

export const useAppStore = defineStore('app', {
  state: (): StoreState => ({
    ...createInitialState(),
    viewPrefs: { density: '10x10' },
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
  },
})


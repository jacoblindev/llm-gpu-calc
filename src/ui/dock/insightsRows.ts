import type { FitStatusEntry, FitBadge } from '../status/fitBadge'
import { resolveFitBadge } from '../status/fitBadge'
import type { UnitPreference, Gpu } from '@shared/types'
import { formatBytes } from '@shared/units'

export interface InsightRow {
  id: string
  name: string
  badge: FitBadge
  reason: string
  usedLabel: string
  freeLabel: string
}

interface BuildRowsInput {
  fit: readonly FitStatusEntry[]
  gpus: readonly Gpu[]
  gpuCatalog: readonly Gpu[]
  unit: UnitPreference
}

const SEVERITY_RANK: Record<FitBadge['variant'], number> = {
  over: 0,
  warn: 1,
  ok: 2,
}

export function buildInsightRows(input: BuildRowsInput): InsightRow[] {
  const gpuNameById = new Map<string, string>()
  for (const gpu of input.gpus) {
    gpuNameById.set(gpu.id, gpu.name)
  }
  for (const gpu of input.gpuCatalog) {
    if (!gpuNameById.has(gpu.id)) {
      gpuNameById.set(gpu.id, gpu.name)
    }
  }

  const rows = input.fit.map((entry) => {
    const badge = resolveFitBadge(entry)
    const name = gpuNameById.get(entry.gpuId) || entry.gpuId
    const usedLabel = formatBytes(entry.used, input.unit, 1)
    const freeLabel = formatBytes(entry.free, input.unit, 1)
    const reason = entry.reason || (badge.variant === 'ok' ? 'Within capacity' : badge.title)

    return {
      id: entry.gpuId,
      name,
      badge,
      reason,
      usedLabel,
      freeLabel,
    }
  })

  return rows.sort((a, b) => {
    const severityDelta = SEVERITY_RANK[a.badge.variant] - SEVERITY_RANK[b.badge.variant]
    if (severityDelta !== 0) return severityDelta
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  })
}

import { describe, expect, it } from 'vitest'
import { buildInsightRows } from './insightsRows'
import type { FitStatusEntry } from '../status/fitBadge'
import type { Gpu, UnitPreference } from '@shared/types'

const sampleGpus: Gpu[] = [
  { id: 'gpu-a', name: 'A100', vendor: 'NVIDIA', vramBytes: 80 * 1024 ** 3 },
  { id: 'gpu-b', name: 'H100', vendor: 'NVIDIA', vramBytes: 120 * 1024 ** 3 },
]

const fitEntries: FitStatusEntry[] = [
  { gpuId: 'gpu-b', ok: false, reason: 'Over capacity', used: 1000, free: 0 },
  { gpuId: 'gpu-c', ok: true, reason: 'High utilization >95%', used: 500, free: 200 },
  { gpuId: 'gpu-a', ok: true, used: 100, free: 900 },
]

const unit: UnitPreference = 'GiB'

describe('buildInsightRows', () => {
  it('sorts rows by severity and formats labels', () => {
    const rows = buildInsightRows({ fit: fitEntries, gpus: sampleGpus, gpuCatalog: sampleGpus, unit })
    expect(rows.map((r) => r.id)).toEqual(['gpu-b', 'gpu-c', 'gpu-a'])
    expect(rows[0].badge.label).toBe('Over')
    expect(rows[1].badge.label).toBe('Warning')
    expect(rows[2].badge.label).toBe('OK')
    expect(rows[0].usedLabel).toMatch(/GiB$/)
    expect(rows[2].reason).toBe('Within capacity')
  })

  it('falls back to GPU id when name missing', () => {
    const rows = buildInsightRows({ fit: fitEntries, gpus: [], gpuCatalog: [], unit })
    const ids = rows.map((r) => r.name)
    expect(ids).toContain('gpu-b')
  })
})

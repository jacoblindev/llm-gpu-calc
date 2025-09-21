import { formatBytes } from '@shared/units'
import type { UnitPreference } from '@shared/types'

export function formatKpiBytes(bytes: number, unit: UnitPreference, decimals = 1): string {
  // Return '0' for non-finite or non-positive values; negative values are treated as zero.
  if (!Number.isFinite(bytes) || bytes <= 0) return '0'
  return formatBytes(bytes, unit, decimals)
}

export function formatKpiNumber(value: number): string {
  if (!Number.isFinite(value)) return '0'
  return value.toLocaleString('en-US')
}

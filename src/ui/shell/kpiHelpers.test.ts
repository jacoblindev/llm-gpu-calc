import { describe, expect, it } from 'vitest'
import { formatKpiBytes, formatKpiNumber } from './kpiHelpers'

describe('kpi helpers', () => {
  it('formats bytes according to unit', () => {
    const result = formatKpiBytes(1024 ** 3 * 5.5, 'GiB')
    expect(result).toMatch(/5\.5\s?GiB/)
    expect(formatKpiBytes(0, 'GB')).toBe('0')
  })

  it('formats numbers with locale separators', () => {
    expect(formatKpiNumber(12345)).toBe('12,345')
    expect(formatKpiNumber(NaN)).toBe('0')
  })
})

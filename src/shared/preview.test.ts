import { describe, it, expect } from 'vitest'
import { buildSegmentAriaLabel, nextIndexForArrow, segmentPercent, shouldShowInlineLabel } from '@shared/preview'

function fmt(bytes: number) { return `${(bytes / (1024 ** 3)).toFixed(1)} GiB` }

describe('shared/preview: labels and nav helpers', () => {
  it('shows inline label only at >=10% width', () => {
    const cap = 1000
    expect(shouldShowInlineLabel(cap, 99)).toBe(false)
    expect(shouldShowInlineLabel(cap, 100)).toBe(true)
  })

  it('builds aria/tooltip label with model/kind/size/%', () => {
    const cap = 80 * 1024 ** 3
    const seg = 20 * 1024 ** 3
    const label = buildSegmentAriaLabel(cap, seg, 'kv', 'Llama-8B', fmt)
    expect(label).toMatch(/Llama-8B kv:/)
    expect(label).toMatch(/GiB/)
    expect(label).toMatch(/\(25%\)/)
  })

  it('navigates left/right across indices and clamps at edges', () => {
    const len = 4
    expect(nextIndexForArrow(len, 0, 'ArrowLeft')).toBe(0)
    expect(nextIndexForArrow(len, 0, 'ArrowRight')).toBe(1)
    expect(nextIndexForArrow(len, 2, 'ArrowRight')).toBe(3)
    expect(nextIndexForArrow(len, 3, 'ArrowRight')).toBe(3)
    expect(nextIndexForArrow(len, 3, 'ArrowLeft')).toBe(2)
  })
})


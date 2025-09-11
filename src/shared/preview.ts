export type SegmentKind = 'weights' | 'kv' | 'reserve' | 'free'

/** Percent width of a segment within total capacity (0..100). */
export function segmentPercent(capacityBytes: number, segmentBytes: number): number {
  const total = capacityBytes || 1
  return (segmentBytes / total) * 100
}

/** Inline labels show only when the segment occupies >= 10% width. */
export function shouldShowInlineLabel(capacityBytes: number, segmentBytes: number): boolean {
  return segmentPercent(capacityBytes, segmentBytes) >= 10
}

/**
 * Builds an ARIA/tooltip label like "ModelA kv: 10.0 GiB (25%)".
 * `formatBytes` is injected to avoid UI dependency; caller provides units/precision.
 */
export function buildSegmentAriaLabel(
  capacityBytes: number,
  segmentBytes: number,
  kind: SegmentKind,
  modelName?: string,
  formatBytes?: (bytes: number) => string,
): string {
  const pct = Math.round(segmentPercent(capacityBytes, segmentBytes))
  const size = formatBytes ? formatBytes(segmentBytes) : `${segmentBytes} B`
  const labelBase = kind === 'weights' || kind === 'kv'
    ? `${(modelName ?? '').trim()} ${kind}`.trim()
    : kind
  return `${labelBase}: ${size} (${pct}%)`
}

/**
 * Keyboard navigation helper for Left/Right across segments.
 * Returns the next index or the same index if at an edge or unsupported key.
 */
export function nextIndexForArrow(length: number, currentIndex: number, key: string): number {
  if (key !== 'ArrowLeft' && key !== 'ArrowRight') return currentIndex
  const delta = key === 'ArrowLeft' ? -1 : 1
  const next = currentIndex + delta
  if (next < 0 || next >= length) return currentIndex
  return next
}


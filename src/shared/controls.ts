/** Generic helpers for numeric inputs with min/step semantics. */

export function clampMin(value: number, min: number): number {
  return Math.max(min, Number.isFinite(value) ? value : min)
}

export function snapToStep(value: number, step: number, min = 0, mode: 'nearest'|'floor'|'ceil' = 'nearest'): number {
  if (!Number.isFinite(value)) return min
  const s = Math.max(1, Math.floor(step))
  const offset = value - min
  const units = offset / s
  let snappedUnits: number
  switch (mode) {
    case 'floor': snappedUnits = Math.floor(units); break
    case 'ceil': snappedUnits = Math.ceil(units); break
    default: snappedUnits = Math.round(units); break
  }
  const snapped = min + snappedUnits * s
  return clampMin(snapped, min)
}

export function adjustByDelta(current: number, delta: number, step: number, min: number): number {
  const next = current + delta * step
  return clampMin(next, min)
}

export function adjustByKey(current: number, key: string, step: number, min: number): number {
  if (key === 'ArrowUp') return adjustByDelta(current, +1, step, min)
  if (key === 'ArrowDown') return adjustByDelta(current, -1, step, min)
  return current
}

// Specializations for this app
export function normalizeMaxModelLenInput(value: number): number {
  // min 0, step 128, round to nearest step
  return snapToStep(clampMin(Math.floor(value || 0), 0), 128, 0, 'nearest')
}

export function normalizeMaxNumSeqsInput(value: number): number {
  // min 1, step 1
  return clampMin(Math.floor(value || 1), 1)
}

export function stepMaxModelLen(current: number, delta: number): number {
  return clampMin(current + delta * 128, 0)
}

export function stepMaxNumSeqs(current: number, delta: number): number {
  return clampMin(current + delta * 1, 1)
}


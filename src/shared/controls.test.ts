import { describe, it, expect } from 'vitest'
import {
  clampMin, snapToStep, adjustByDelta, adjustByKey,
  normalizeMaxModelLenInput, normalizeMaxNumSeqsInput,
  stepMaxModelLen, stepMaxNumSeqs,
  validateMaxModelLen, validateMaxNumSeqs,
} from '@shared/controls'

describe('shared/controls: min/step helpers', () => {
  it('clamps to min and snaps to step for model len', () => {
    expect(normalizeMaxModelLenInput(0)).toBe(0)
    expect(normalizeMaxModelLenInput(127)).toBe(128) // nearest -> 128
    expect(normalizeMaxModelLenInput(129)).toBe(128)
    expect(normalizeMaxModelLenInput(256)).toBe(256)
  })

  it('enforces min 1 for num seqs', () => {
    expect(normalizeMaxNumSeqsInput(0)).toBe(1)
    expect(normalizeMaxNumSeqsInput(1)).toBe(1)
    expect(normalizeMaxNumSeqsInput(5.9)).toBe(5)
  })

  it('arrow keys adjust by step and respect min', () => {
    expect(adjustByKey(0, 'ArrowUp', 128, 0)).toBe(128)
    expect(adjustByKey(128, 'ArrowDown', 128, 0)).toBe(0)
    expect(adjustByKey(0, 'ArrowDown', 128, 0)).toBe(0)
  })

  it('step helpers move by correct deltas', () => {
    expect(stepMaxModelLen(256, +1)).toBe(384)
    expect(stepMaxModelLen(0, -1)).toBe(0)
    expect(stepMaxNumSeqs(3, +1)).toBe(4)
    expect(stepMaxNumSeqs(1, -1)).toBe(1)
  })

  it('validation messages for len and seqs', () => {
    expect(validateMaxModelLen(-1)).toBeTruthy()
    expect(validateMaxModelLen(127)).toBe('Step: 128')
    expect(validateMaxModelLen(128)).toBeNull()
    expect(validateMaxNumSeqs(0)).toBeTruthy()
    expect(validateMaxNumSeqs(1)).toBeNull()
  })
})

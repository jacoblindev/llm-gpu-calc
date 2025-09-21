import { describe, expect, it, vi } from 'vitest'
import { getNextFocusable, isFocusableCandidate } from './focusLoop'

function mockElement(options: { tabIndex?: number; hidden?: boolean; ariaHidden?: boolean } = {}) {
  const focus = vi.fn()
  const attributes = new Map<string, string>()
  if (options.tabIndex !== undefined) {
    attributes.set('tabindex', String(options.tabIndex))
  }
  if (options.ariaHidden) {
    attributes.set('aria-hidden', 'true')
  }
  const element = {
    focus,
    tabIndex: options.tabIndex ?? 0,
    hidden: options.hidden ?? false,
    hasAttribute(name: string) {
      return attributes.has(name)
    },
    getAttribute(name: string) {
      return attributes.get(name) ?? null
    },
  } as unknown as HTMLElement
  return { element, focus }
}

describe('focusLoop', () => {
  it('returns first element when current is null', () => {
    const a = mockElement()
    const b = mockElement()
    const next = getNextFocusable([a.element, b.element], null, false)
    expect(next).toBe(a.element)
  })

  it('wraps forward when reaching the end', () => {
    const a = mockElement()
    const b = mockElement()
    const next = getNextFocusable([a.element, b.element], b.element, false)
    expect(next).toBe(a.element)
  })

  it('wraps backward when shift-tabbing from the first element', () => {
    const a = mockElement()
    const b = mockElement()
    const next = getNextFocusable([a.element, b.element], a.element, true)
    expect(next).toBe(b.element)
  })

  it('skips nodes that are aria-hidden or negative tabindex', () => {
    const visible = mockElement()
    const ariaHidden = mockElement({ ariaHidden: true })
    const negative = mockElement({ tabIndex: -1 })
    const next = getNextFocusable([ariaHidden.element, negative.element, visible.element], ariaHidden.element, false)
    expect(next).toBe(visible.element)
  })

  it('flags viable focus candidates correctly', () => {
    const visible = mockElement()
    const hidden = mockElement({ hidden: true })
    const ariaHidden = mockElement({ ariaHidden: true })
    const negative = mockElement({ tabIndex: -1 })

    expect(isFocusableCandidate(visible.element)).toBe(true)
    expect(isFocusableCandidate(hidden.element)).toBe(false)
    expect(isFocusableCandidate(ariaHidden.element)).toBe(false)
    expect(isFocusableCandidate(negative.element)).toBe(false)
  })
})

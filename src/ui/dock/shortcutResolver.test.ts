import { describe, expect, it } from 'vitest'
import { resolveDockShortcut } from './shortcutResolver'

type MockElementOptions = {
  role?: string
  contentEditable?: boolean
}

function createMockElement(tagName: string, options: MockElementOptions = {}) {
  const attributes = new Map<string, string>()
  if (options.role) attributes.set('role', options.role)
  return {
    tagName,
    isContentEditable: options.contentEditable ?? false,
    getAttribute(name: string) {
      return attributes.get(name) ?? null
    },
  } as unknown as HTMLElement
}

function makeEvent(overrides: Partial<KeyboardEvent> & { key: string; target?: EventTarget | null }): KeyboardEvent {
  const event = {
    key: overrides.key,
    target: overrides.target ?? null,
    metaKey: overrides.metaKey ?? false,
    ctrlKey: overrides.ctrlKey ?? false,
    altKey: overrides.altKey ?? false,
    shiftKey: overrides.shiftKey ?? false,
    defaultPrevented: overrides.defaultPrevented ?? false,
    isTrusted: true,
  } as KeyboardEvent
  return event
}

describe('resolveDockShortcut', () => {
  it('returns toggle shortcut for E', () => {
    const event = makeEvent({ key: 'E' })
    expect(resolveDockShortcut(event)).toEqual({ type: 'toggle' })
  })

  it('returns tab shortcut for G/M/W', () => {
    expect(resolveDockShortcut(makeEvent({ key: 'g' }))).toEqual({ type: 'tab', tab: 'gpus' })
    expect(resolveDockShortcut(makeEvent({ key: 'M' }))).toEqual({ type: 'tab', tab: 'models' })
    expect(resolveDockShortcut(makeEvent({ key: 'w' }))).toEqual({ type: 'tab', tab: 'workload' })
  })

  it('ignores events with modifier keys', () => {
    const event = makeEvent({ key: 'e', ctrlKey: true })
    expect(resolveDockShortcut(event)).toBeNull()
  })

  it('ignores events from input-like elements', () => {
    const input = createMockElement('INPUT')
    const textArea = createMockElement('TEXTAREA')
    const contentEditable = createMockElement('DIV', { contentEditable: true })

    expect(resolveDockShortcut(makeEvent({ key: 'e', target: input }))).toBeNull()
    expect(resolveDockShortcut(makeEvent({ key: 'g', target: textArea }))).toBeNull()
    expect(resolveDockShortcut(makeEvent({ key: 'm', target: contentEditable }))).toBeNull()
  })

  it('allows shortcuts for buttons and anchors', () => {
    const button = createMockElement('BUTTON')
    const anchor = createMockElement('A')

    expect(resolveDockShortcut(makeEvent({ key: 'e', target: button }))).toEqual({ type: 'toggle' })
    expect(resolveDockShortcut(makeEvent({ key: 'g', target: anchor }))).toEqual({ type: 'tab', tab: 'gpus' })
  })

  it('ignores unknown keys', () => {
    expect(resolveDockShortcut(makeEvent({ key: 'x' }))).toBeNull()
  })
})

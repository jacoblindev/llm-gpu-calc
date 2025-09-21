import { describe, it, expect, beforeEach } from 'vitest'
import {
  defaultViewPrefs,
  parseFromURL,
  applyToURL,
  persistToLocalStorage,
  loadFromLocalStorage,
  type ViewPrefsShape,
} from './viewPrefs'

describe('viewPrefs utilities', () => {
  beforeEach(() => {
    // simple in-memory localStorage mock
    const store = new Map<string, string>()
    ;(globalThis as any).localStorage = {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => { store.set(k, v) },
      removeItem: (k: string) => { store.delete(k) },
      clear: () => { store.clear() },
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      get length() { return store.size },
    }
  })

  it('parses from URL and applies to URL with only non-defaults', () => {
    const parsed = parseFromURL('?density=20&sort=status_used&status=warn&vendor=NVIDIA&q=h100')
    expect(parsed.density).toBe('20x20')
    expect(parsed.sort).toBe('status_used')
    expect(parsed.statusFilter).toBe('warn')
    expect(parsed.vendorFilter).toBe('NVIDIA')
    expect(parsed.search).toBe('h100')

    const prefs: ViewPrefsShape = {
      ...defaultViewPrefs,
      density: '20x20', // non-default
      statusFilter: 'warn', // non-default
    }
    const q = applyToURL('', prefs)
    // sort is default, vendor/search default -> not present
    expect(q.includes('density=20x20')).toBe(true)
    expect(q.includes('status=warn')).toBe(true)
    expect(q.includes('sort=')).toBe(false)
    expect(q.includes('vendor=')).toBe(false)
    expect(q.includes('q=')).toBe(false)
  })

  it('persists to and loads from localStorage', () => {
    const prefs: ViewPrefsShape = {
      ...defaultViewPrefs,
      density: '20x20',
      sort: 'status_used',
      statusFilter: 'over',
      vendorFilter: 'NVIDIA',
      search: 'A100',
    }
    persistToLocalStorage(prefs)
    const loaded = loadFromLocalStorage()
    expect(loaded.density).toBe('20x20')
    expect(loaded.statusFilter).toBe('over')
    expect(loaded.vendorFilter).toBe('NVIDIA')
    expect(loaded.search).toBe('A100')
  })
})


// Utilities to parse and persist view preferences via URL and localStorage

export type Density = '10x10' | '20x20'

export interface ViewPrefsShape {
  density: Density
  sort: string
  statusFilter: string // 'all' | 'ok' | 'warn' | 'over'
  vendorFilter: string // e.g., 'NVIDIA' | 'AMD' | '' (all)
  search: string
}

const LS_KEY = 'viewPrefs.v3'

export const defaultViewPrefs: ViewPrefsShape = {
  density: '10x10',
  sort: 'status_used',
  statusFilter: 'all',
  vendorFilter: '',
  search: '',
}

export function normalizeDensity(input: string | null | undefined): Density | undefined {
  if (!input) return undefined
  const v = input.toLowerCase()
  if (v === '10' || v === '10x10') return '10x10'
  if (v === '20' || v === '20x20') return '20x20'
  return undefined
}

export function parseFromURL(search: string): Partial<ViewPrefsShape> {
  try {
    const qp = new URLSearchParams(search)
    const density = normalizeDensity(qp.get('density') || undefined)
    const sort = qp.get('sort') || undefined
    const status = qp.get('status') || undefined
    const vendor = qp.get('vendor') || undefined
    const q = qp.get('q') || undefined
    const out: Partial<ViewPrefsShape> = {}
    if (density) out.density = density
    if (sort) out.sort = sort
    if (status) out.statusFilter = status
    if (vendor !== undefined) out.vendorFilter = vendor
    if (q !== undefined) out.search = q
    return out
  } catch {
    return {}
  }
}

export function loadFromLocalStorage(): Partial<ViewPrefsShape> {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return {}
    const obj = JSON.parse(raw)
    const out: Partial<ViewPrefsShape> = {}
    if (obj && typeof obj === 'object') {
      if (obj.density) out.density = normalizeDensity(String(obj.density)) || defaultViewPrefs.density
      if (typeof obj.sort === 'string') out.sort = obj.sort
      if (typeof obj.statusFilter === 'string') out.statusFilter = obj.statusFilter
      if (typeof obj.vendorFilter === 'string') out.vendorFilter = obj.vendorFilter
      if (typeof obj.search === 'string') out.search = obj.search
    }
    return out
  } catch {
    return {}
  }
}

export function persistToLocalStorage(prefs: ViewPrefsShape): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(prefs))
  } catch {}
}

export function applyToURL(currentSearch: string, prefs: ViewPrefsShape): string {
  try {
    const qp = new URLSearchParams(currentSearch)
    // only include non-defaults to keep URLs clean
    const setOrDelete = (k: string, value: string, defaultValue: string) => {
      if (value && value !== defaultValue) qp.set(k, value)
      else qp.delete(k)
    }
    setOrDelete('density', prefs.density, defaultViewPrefs.density)
    setOrDelete('sort', prefs.sort, defaultViewPrefs.sort)
    setOrDelete('status', prefs.statusFilter, defaultViewPrefs.statusFilter)
    setOrDelete('vendor', prefs.vendorFilter, defaultViewPrefs.vendorFilter)
    setOrDelete('q', prefs.search, defaultViewPrefs.search)
    return qp.toString()
  } catch {
    return currentSearch.replace(/^\?/, '')
  }
}


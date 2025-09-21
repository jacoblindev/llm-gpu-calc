import type { ControlDockTab } from './dockTypes'

const BLOCKED_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

export type DockShortcut =
  | { type: 'toggle' }
  | { type: 'tab'; tab: ControlDockTab }

function isInputLike(target: HTMLElement | null): boolean {
  if (!target) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  if (BLOCKED_TAGS.has(tag)) return true
  if (tag === 'BUTTON') return false
  if (tag === 'A') return false
  if (tag === 'DIV') {
    const role = target.getAttribute('role')
    if (role && ['textbox', 'combobox'].includes(role)) return true
  }
  return false
}

export function resolveDockShortcut(event: KeyboardEvent): DockShortcut | null {
  if (event.defaultPrevented) return null
  if (event.metaKey || event.ctrlKey || event.altKey) return null
  if (isInputLike(event.target as HTMLElement | null)) return null

  const key = event.key.toLowerCase()
  if (key === 'e') return { type: 'toggle' }
  if (key === 'g') return { type: 'tab', tab: 'gpus' }
  if (key === 'm') return { type: 'tab', tab: 'models' }
  if (key === 'w') return { type: 'tab', tab: 'workload' }
  return null
}

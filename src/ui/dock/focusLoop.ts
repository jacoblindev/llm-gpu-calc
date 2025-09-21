export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]'
].join(', ')

type MaybeFocusable = {
  focus?: () => void
  disabled?: boolean
  tabIndex?: number
  getAttribute?: (name: string) => string | null
  hasAttribute?: (name: string) => boolean
  hidden?: boolean
}

function getTabIndex(node: HTMLElement): number {
  const attr = node.getAttribute('tabindex')
  if (attr !== null) {
    const parsed = Number(attr)
    if (!Number.isNaN(parsed)) return parsed
  }
  return node.tabIndex
}

export function isFocusableCandidate(node: HTMLElement): boolean {
  if (node.hasAttribute?.('disabled')) return false
  if (node.getAttribute?.('aria-hidden') === 'true') return false
  if (node.hidden) return false
  const tabIndex = getTabIndex(node)
  if (tabIndex < 0) return false
  if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
    const style = window.getComputedStyle(node)
    if (style) {
      if (style.display === 'none' || style.visibility === 'hidden') return false
    }
  }
  return true
}

export function getNextFocusable(
  nodes: HTMLElement[],
  current: HTMLElement | null,
  shift: boolean
): HTMLElement | null {
  const focusable = nodes.filter(isFocusableCandidate)
  if (!focusable.length) return null

  const startIndex = current ? focusable.indexOf(current) : -1
  if (startIndex === -1) {
    return shift ? focusable[focusable.length - 1] : focusable[0]
  }

  if (shift) {
    const nextIndex = startIndex - 1
    return nextIndex >= 0 ? focusable[nextIndex] : focusable[focusable.length - 1]
  }

  const nextIndex = startIndex + 1
  return nextIndex < focusable.length ? focusable[nextIndex] : focusable[0]
}

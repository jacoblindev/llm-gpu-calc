export function isTruthy(s: string | null | undefined): boolean {
  if (!s) return false
  const v = s.toLowerCase()
  return v === '1' || v === 'true' || v === 'yes' || v === 'on'
}

export function isFalsy(s: string | null | undefined): boolean {
  if (!s) return false
  const v = s.toLowerCase()
  return v === '0' || v === 'false' || v === 'no' || v === 'off'
}

/** Feature flag: enable v3 Dashboard shell.
 * Priority: URL ?v3=.. > localStorage 'useV3Shell' > env VITE_V3_SHELL
 */
export function isV3ShellEnabled(): boolean {
  try {
    const qp = new URLSearchParams(window.location.search)
    const q = qp.get('v3') || qp.get('shell')
    if (isTruthy(q)) return true
    if (isFalsy(q)) return false
  } catch {}
  try {
    const ls = localStorage.getItem('useV3Shell')
    if (isTruthy(ls)) return true
    if (isFalsy(ls)) return false
  } catch {}
  const env = import.meta.env?.VITE_V3_SHELL
  if (typeof env === 'string') return isTruthy(env)
  return false
}

export function setV3ShellEnabled(on: boolean): void {
  try {
    localStorage.setItem('useV3Shell', on ? '1' : '0')
  } catch {}
}


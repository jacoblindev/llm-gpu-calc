export interface FitStatusEntry {
  gpuId: string
  ok: boolean
  reason?: string
  used: number
  free: number
}

export interface FitBadge {
  variant: 'ok' | 'warn' | 'over'
  label: 'OK' | 'Warning' | 'Over'
  title: string
}

export function resolveFitBadge(entry: FitStatusEntry): FitBadge {
  if (!entry.ok) {
    return {
      variant: 'over',
      label: 'Over',
      title: entry.reason || 'Over capacity or no headroom',
    }
  }

  const reason = entry.reason || 'Within capacity'
  if (reason.toLowerCase().includes('high utilization')) {
    return {
      variant: 'warn',
      label: 'Warning',
      title: reason,
    }
  }

  return {
    variant: 'ok',
    label: 'OK',
    title: reason,
  }
}

import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { useControlDockState } from './useControlDockState'

describe('useControlDockState', () => {
  it('opens to a tab and remembers the trigger', () => {
    const dock = useControlDockState('gpus')
    const trigger = { focus: vi.fn() }
    dock.open('models', trigger)

    expect(dock.isOpen.value).toBe(true)
    expect(dock.activeTab.value).toBe('models')
    expect(dock.lastTrigger.value?.focus).toBe(trigger.focus)
  })

  it('restores focus to the last trigger when closing', async () => {
    const dock = useControlDockState('gpus')
    const focus = vi.fn()
    dock.open('workload', { focus })

    dock.close()
    await nextTick()

    expect(focus).toHaveBeenCalledTimes(1)
    expect(dock.isOpen.value).toBe(false)
  })

  it('switches tab without clobbering the recorded trigger', () => {
    const dock = useControlDockState('gpus')
    const trigger = { focus: vi.fn() }
    dock.open('models', trigger)

    dock.setTab('workload')

    expect(dock.activeTab.value).toBe('workload')
    expect(dock.lastTrigger.value?.focus).toBe(trigger.focus)
  })
})

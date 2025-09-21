import { nextTick, ref } from 'vue'
import type { ControlDockTab } from './dockTypes'

type FocusTarget = { focus?: () => void } | null | undefined

export function useControlDockState(initialTab: ControlDockTab = 'gpus') {
  const isOpen = ref(false)
  const activeTab = ref<ControlDockTab>(initialTab)
  const lastTrigger = ref<FocusTarget>(null)

  function open(tab: ControlDockTab, trigger?: FocusTarget) {
    activeTab.value = tab
    if (trigger) {
      lastTrigger.value = trigger
    }
    isOpen.value = true
  }

  function close() {
    if (!isOpen.value) return
    isOpen.value = false
    const trigger = lastTrigger.value
    if (trigger && typeof trigger.focus === 'function') {
      nextTick(() => {
        trigger.focus?.()
      })
    }
  }

  function setTab(tab: ControlDockTab) {
    activeTab.value = tab
  }

  return {
    isOpen,
    activeTab,
    open,
    close,
    setTab,
    lastTrigger,
  }
}

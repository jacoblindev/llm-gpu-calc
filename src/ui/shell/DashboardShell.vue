<template>
  <div class="dashboard-shell">
    <CommandStrip
      :dock-open="isDockOpen"
      :active-tab="activeTab"
      @toggle-dock="onCommandStripToggle"
      @select-dock-tab="onCommandStripSelectTab"
    />
    <main class="dashboard-shell__main">
      <VizCanvas class="dashboard-shell__canvas" @inspect="onInspect" />
      <ControlDock
        :open="isDockOpen"
        :active-tab="activeTab"
        @close="closeDock"
        @change-tab="setActiveTab"
      />
      <InsightsDrawer :open="isInsightsOpen" @close="closeInsights" />
      <TileInspector
        :open="isInspectorOpen"
        :selection="inspectorSelection"
        @close="closeInspector"
      />
    </main>
    <FooterBar />
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import CommandStrip from './CommandStrip.vue'
import VizCanvas from '../viz/VizCanvas.vue'
import ControlDock from '../dock/ControlDock.vue'
import InsightsDrawer from '../dock/InsightsDrawer.vue'
import TileInspector from '../inspector/TileInspector.vue'
import FooterBar from '../FooterBar.vue'
import type { ControlDockTab } from '../dock/dockTypes'
import { useControlDockState } from '../dock/useControlDockState'
import { resolveDockShortcut } from '../dock/shortcutResolver'
import { useAppStore } from '@app/store'

const { isOpen, activeTab, open, close, setTab } = useControlDockState('gpus')
const isDockOpen = isOpen
const commandToggleRef = ref<HTMLElement | null>(null)
const isInsightsOpen = ref(false)
const insightsLastTrigger = ref<HTMLElement | null>(null)
const store = useAppStore()
const isInspectorOpen = ref(false)
const inspectorSelection = ref<{ id: string; name: string } | null>(null)
const inspectorLastTrigger = ref<HTMLElement | null>(null)

interface DockTabSelection {
  tab: ControlDockTab
  trigger?: HTMLElement | null
}

function resolveTrigger(preferred?: HTMLElement | null) {
  if (preferred) return preferred
  if (commandToggleRef.value) return commandToggleRef.value
  return document.activeElement instanceof HTMLElement ? document.activeElement : null
}

function toggleDock(trigger?: HTMLElement | null) {
  if (isDockOpen.value) {
    close()
    return
  }
  open(activeTab.value, resolveTrigger(trigger))
}

function activateDockTab(tab: ControlDockTab, trigger?: HTMLElement | null) {
  if (trigger) {
    open(tab, trigger)
    return
  }
  if (!isDockOpen.value) {
    open(tab, resolveTrigger())
    return
  }
  setTab(tab)
}

function closeDock() {
  close()
}

function setActiveTab(tab: ControlDockTab) {
  setTab(tab)
}

function openInsights(trigger?: HTMLElement | null, setWarnings = false) {
  if (setWarnings) {
    store.setStatusFilter('warn')
  }
  const resolved = resolveTrigger(trigger)
  if (resolved) insightsLastTrigger.value = resolved
  isInsightsOpen.value = true
}

function closeInsights() {
  if (!isInsightsOpen.value) return
  isInsightsOpen.value = false
  const trigger = insightsLastTrigger.value
  if (trigger) {
    nextTick(() => trigger.focus?.())
  }
}

function openInspector(payload: { gpuId: string; name: string }, trigger?: HTMLElement | null) {
  inspectorSelection.value = { id: payload.gpuId, name: payload.name }
  const resolved = trigger ?? resolveTrigger()
  if (resolved) inspectorLastTrigger.value = resolved
  isInspectorOpen.value = true
}

function closeInspector() {
  if (!isInspectorOpen.value) return
  isInspectorOpen.value = false
  const trigger = inspectorLastTrigger.value
  if (trigger) {
    nextTick(() => trigger.focus?.())
  }
}

function onCommandStripToggle(trigger?: HTMLElement | null) {
  if (trigger) commandToggleRef.value = trigger
  toggleDock(trigger)
}

function onCommandStripSelectTab({ tab, trigger }: DockTabSelection) {
  if (trigger) commandToggleRef.value = trigger
  activateDockTab(tab, trigger)
}

function onInspect(event: { gpuId: string; name: string; trigger: HTMLElement | null }) {
  openInspector({ gpuId: event.gpuId, name: event.name }, event.trigger)
}

function onGlobalKeydown(event: KeyboardEvent) {
  const action = resolveDockShortcut(event)
  if (!action) return
  event.preventDefault()
  const invoker = resolveTrigger()
  if (action.type === 'toggle') {
    toggleDock(invoker)
    return
  }
  if (action.type === 'tab') {
    activateDockTab(action.tab, invoker)
    return
  }
  if (action.type === 'insights') {
    const warningsActive = store.viewPrefs.statusFilter === 'warn'
    if (isInsightsOpen.value && warningsActive) {
      store.setStatusFilter('all')
      closeInsights()
    } else {
      openInsights(invoker, true)
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeydown, { capture: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeydown, { capture: true })
})
</script>

<style scoped>
.dashboard-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-bg, #0b0f17);
  color: var(--color-text, #e5e7eb);
}

.dashboard-shell__main {
  position: relative;
  flex: 1;
  display: flex;
}

.dashboard-shell__canvas {
  flex: 1;
  min-height: 0;
}
</style>

<template>
  <div class="dashboard-shell">
    <CommandStrip
      :dock-open="isDockOpen"
      :active-tab="activeTab"
      @toggle-dock="onCommandStripToggle"
      @select-dock-tab="onCommandStripSelectTab"
    />
    <main class="dashboard-shell__main">
      <VizCanvas class="dashboard-shell__canvas" />
      <ControlDock
        :open="isDockOpen"
        :active-tab="activeTab"
        @close="closeDock"
        @change-tab="setActiveTab"
      />
      <InsightsDrawer class="hidden" />
      <TileInspector class="hidden" />
    </main>
    <FooterBar />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import CommandStrip from './CommandStrip.vue'
import VizCanvas from '../viz/VizCanvas.vue'
import ControlDock from '../dock/ControlDock.vue'
import InsightsDrawer from '../dock/InsightsDrawer.vue'
import TileInspector from '../inspector/TileInspector.vue'
import FooterBar from '../FooterBar.vue'
import type { ControlDockTab } from '../dock/dockTypes'
import { useControlDockState } from '../dock/useControlDockState'
import { resolveDockShortcut } from '../dock/shortcutResolver'

const { isOpen, activeTab, open, close, setTab } = useControlDockState('gpus')
const isDockOpen = isOpen
const commandToggleRef = ref<HTMLElement | null>(null)

interface DockTabSelection {
  tab: ControlDockTab
  trigger?: HTMLElement | null
}

function toggleDock(trigger?: HTMLElement | null) {
  if (isDockOpen.value) {
    close()
    return
  }
  const fallback = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
  open(activeTab.value, fallback)
}

function activateDockTab(tab: ControlDockTab, trigger?: HTMLElement | null) {
  if (trigger) {
    open(tab, trigger)
    return
  }
  if (!isDockOpen.value) {
    const fallback = document.activeElement instanceof HTMLElement ? document.activeElement : null
    open(tab, fallback)
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

function onCommandStripToggle(trigger?: HTMLElement | null) {
  if (trigger) commandToggleRef.value = trigger
  toggleDock(trigger ?? commandToggleRef.value ?? null)
}

function onCommandStripSelectTab({ tab, trigger }: DockTabSelection) {
  if (trigger) commandToggleRef.value = trigger
  activateDockTab(tab, trigger ?? commandToggleRef.value ?? null)
}

function onGlobalKeydown(event: KeyboardEvent) {
  const action = resolveDockShortcut(event)
  if (!action) return
  event.preventDefault()
  const invoker = commandToggleRef.value ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
  if (action.type === 'toggle') {
    toggleDock(invoker)
    return
  }
  activateDockTab(action.tab, invoker)
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

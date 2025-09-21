<template>
  <Teleport to="body">
    <div class="sr-only" aria-live="polite" aria-atomic="true">{{ liveMessage }}</div>
    <transition name="control-dock-fade">
      <div v-if="open" class="control-dock__scrim" aria-hidden="true" />
    </transition>
    <transition name="control-dock-slide">
      <aside
        v-if="open"
        class="control-dock"
        role="dialog"
        aria-modal="true"
        aria-labelledby="control-dock-title"
        aria-describedby="control-dock-description"
        data-test="control-dock"
        ref="rootRef"
        @keydown.capture="onKeydown"
      >
        <header class="control-dock__header">
          <div class="control-dock__titles">
            <span class="control-dock__eyebrow">Input Editor</span>
            <h2 id="control-dock-title">Control Dock</h2>
            <p id="control-dock-description" class="control-dock__subtitle">
              Tune GPUs, deployments, and workload without leaving the visualization.
            </p>
          </div>
          <button type="button" class="control-dock__close" aria-label="Close Control Dock" @click="onClose">
            <span aria-hidden="true">&times;</span>
          </button>
        </header>

        <nav class="control-dock__tabs" role="tablist" aria-label="Editor tabs">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            :id="`dock-tab-${tab.id}`"
            type="button"
            :class="['control-dock__tab', { 'is-active': tab.id === props.activeTab }]"
            role="tab"
            :aria-selected="tab.id === props.activeTab"
            :aria-controls="`dock-panel-${tab.id}`"
            @click="onTabClick(tab.id)"
            :ref="(el) => setTabRef(tab.id, el as HTMLButtonElement | null)"
          >
            <span class="control-dock__tab-label">{{ tab.shortLabel }}</span>
          </button>
        </nav>

        <div class="control-dock__body">
          <section
            v-for="tab in tabs"
            :key="tab.id"
            class="control-dock__panel"
            role="tabpanel"
            :id="`dock-panel-${tab.id}`"
            :aria-labelledby="`dock-tab-${tab.id}`"
            v-show="props.activeTab === tab.id"
          >
            <header class="control-dock__panel-header">
              <h3>{{ tab.label }}</h3>
              <p>{{ tab.description }}</p>
            </header>

            <div class="control-dock__panel-content" v-if="tab.id === 'gpus'">
              <GpuSelector :state="appState" />
              <p class="control-dock__meta" aria-live="polite">
                {{ selectedGpuCount }} GPU{{ selectedGpuCount === 1 ? '' : 's' }} selected.
              </p>
            </div>

            <div class="control-dock__panel-content" v-else-if="tab.id === 'models'">
              <DeploymentModels :state="appState" @add="onAddDeployment" @remove="onRemoveDeployment" />
              <p class="control-dock__meta" aria-live="polite">
                {{ deploymentCount }} deployment{{ deploymentCount === 1 ? '' : 's' }} configured.
              </p>
            </div>

            <div class="control-dock__panel-content" v-else>
              <DeploymentWorkload :state="appState" />
            </div>
          </section>
        </div>
      </aside>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useAppStore } from '@app/store'
import type { AppState } from '@app/state'
import GpuSelector from '@ui/GpuSelector.vue'
import DeploymentModels from '@ui/DeploymentModels.vue'
import DeploymentWorkload from '@ui/DeploymentWorkload.vue'
import { CONTROL_DOCK_TABS, type ControlDockTab } from './dockTypes'
import { FOCUSABLE_SELECTOR, getNextFocusable, isFocusableCandidate } from './focusLoop'

const props = defineProps<{ open: boolean; activeTab: ControlDockTab }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'change-tab', tab: ControlDockTab): void }>()

const tabs = CONTROL_DOCK_TABS
const store = useAppStore()
const appState = store as unknown as AppState

const rootRef = ref<HTMLElement | null>(null)
const liveMessage = ref('')
const tabRefs = reactive<Record<ControlDockTab, HTMLButtonElement | null>>({
  gpus: null,
  models: null,
  workload: null,
})

function setTabRef(tab: ControlDockTab, el: HTMLButtonElement | null) {
  tabRefs[tab] = el
}

watch(
  () => props.open,
  (open) => {
    const message = open
      ? 'Control Dock opened. Use Tab to move between editor tabs. Press Escape to close.'
      : 'Control Dock closed.'
    liveMessage.value = ''
    nextTick(() => {
      liveMessage.value = message
      if (!open) return
      const focusTarget = tabRefs[props.activeTab] ?? tabRefs.gpus
      focusTarget?.focus()
    })
  }
)

watch(
  () => props.activeTab,
  (tab) => {
    if (!props.open) return
    nextTick(() => {
      tabRefs[tab]?.focus()
    })
  }
)

const selectedGpuCount = computed(() => store.gpus.length)
const deploymentCount = computed(() => store.deployments.length)

function onTabClick(tab: ControlDockTab) {
  if (tab === props.activeTab) return
  emit('change-tab', tab)
  nextTick(() => {
    tabRefs[tab]?.focus()
  })
}

function onClose() {
  emit('close')
}

function onAddDeployment() {
  store.addDeployment()
}

function onRemoveDeployment(id: string) {
  store.removeDeployment(id)
}

function getFocusableElements(): HTMLElement[] {
  const root = rootRef.value
  if (!root) return []
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
  return nodes.filter(isFocusableCandidate)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
    return
  }

  if (event.key !== 'Tab') return

  const focusables = getFocusableElements()
  if (!focusables.length) return
  const current = document.activeElement as HTMLElement | null
  const next = getNextFocusable(focusables, current, event.shiftKey)
  if (!next) return
  event.preventDefault()
  next.focus()
}
</script>

<style scoped>
.control-dock__scrim {
  position: fixed;
  inset: 0;
  background: rgba(9, 12, 18, 0.46);
  backdrop-filter: blur(12px);
  z-index: 40;
}

.control-dock {
  position: fixed;
  inset-y: 0;
  left: 0;
  width: min(420px, 92vw);
  background: linear-gradient(180deg, rgba(17, 24, 39, 0.96) 0%, rgba(11, 15, 23, 0.96) 100%);
  border-right: 1px solid rgba(148, 163, 184, 0.28);
  box-shadow: 0 20px 60px rgba(7, 10, 18, 0.55);
  z-index: 41;
  display: flex;
  flex-direction: column;
  color: var(--color-text, #e5e7eb);
}

.control-dock__header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 1rem;
  padding: 1.25rem 1.5rem 1rem;
}

.control-dock__titles h2 {
  margin: 0.35rem 0 0;
  font-size: 1.35rem;
  letter-spacing: 0.01em;
}

.control-dock__eyebrow {
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.8);
}

.control-dock__subtitle {
  margin: 0.35rem 0 0;
  font-size: 0.85rem;
  color: rgba(148, 163, 184, 0.9);
}

.control-dock__close {
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(15, 23, 42, 0.45);
  color: inherit;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-size: 1.6rem;
  line-height: 1;
}

.control-dock__close:hover {
  border-color: rgba(148, 163, 184, 0.6);
  background: rgba(31, 41, 55, 0.6);
}

.control-dock__tabs {
  display: flex;
  gap: 0.5rem;
  padding: 0 1.5rem 1rem;
}

.control-dock__tab {
  flex: 1;
  padding: 0.65rem 0.75rem;
  border-radius: 12px;
  background: rgba(31, 41, 55, 0.55);
  border: 1px solid rgba(148, 163, 184, 0.28);
  color: rgba(226, 232, 240, 0.9);
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.control-dock__tab.is-active {
  background: linear-gradient(90deg, rgba(34, 211, 238, 0.22), rgba(99, 102, 241, 0.28));
  border-color: rgba(56, 189, 248, 0.65);
  color: #f8fafc;
  box-shadow: 0 0 18px rgba(56, 189, 248, 0.35);
}

.control-dock__body {
  flex: 1;
  overflow-y: auto;
  padding: 0 1.5rem 1.5rem;
}

.control-dock__panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 100%;
}

.control-dock__panel-header h3 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
}

.control-dock__panel-header p {
  margin: 0.35rem 0 0;
  font-size: 0.85rem;
  color: rgba(148, 163, 184, 0.85);
}

.control-dock__panel-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.control-dock__meta {
  font-size: 0.78rem;
  color: rgba(148, 163, 184, 0.95);
}

.control-dock-fade-enter-active,
.control-dock-fade-leave-active {
  transition: opacity 160ms ease;
}

.control-dock-fade-enter-from,
.control-dock-fade-leave-to {
  opacity: 0;
}

.control-dock-slide-enter-active,
.control-dock-slide-leave-active {
  transition: transform 180ms ease, opacity 180ms ease;
}

.control-dock-slide-enter-from {
  transform: translateX(-16px);
  opacity: 0;
}

.control-dock-slide-leave-to {
  transform: translateX(-16px);
  opacity: 0;
}

@media (max-width: 960px) {
  .control-dock {
    width: min(400px, 88vw);
  }
}

@media (max-width: 768px) {
  .control-dock {
    left: 50%;
    transform: translateX(-50%);
    top: auto;
    bottom: 0;
    width: min(720px, 100vw);
    height: min(82vh, 640px);
    border-right: none;
    border-top: 1px solid rgba(148, 163, 184, 0.28);
    border-radius: 24px 24px 0 0;
  }

  .control-dock__tabs {
    padding: 0 1.25rem 1rem;
  }

  .control-dock__body {
    padding: 0 1.25rem 1.5rem;
  }
}
</style>

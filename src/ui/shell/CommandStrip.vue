<template>
  <header class="command-strip" role="banner">
    <div class="command-strip__brand">
      <div class="command-strip__glyph" aria-hidden="true">◇</div>
      <div>
        <p class="command-strip__eyebrow">LLM GPU vRAM Calculator</p>
        <h1>Viz Command Center</h1>
      </div>
    </div>

    <div class="command-strip__summary" role="group" aria-label="Current system snapshot">
      <div class="command-strip__stat">
        <span class="command-strip__stat-label">GPUs</span>
        <span class="command-strip__stat-value">{{ kpis.gpus }}</span>
      </div>
      <div class="command-strip__stat">
        <span class="command-strip__stat-label">Capacity</span>
        <span class="command-strip__stat-value">{{ formattedCapacity }}</span>
      </div>
      <div class="command-strip__stat command-strip__stat--warnings" :class="{ 'has-alert': kpis.warnings > 0 }">
        <span class="command-strip__stat-label">Warnings</span>
        <span class="command-strip__stat-value">{{ kpis.warnings }}</span>
      </div>
    </div>

    <div class="command-strip__actions">
      <div class="command-strip__shortcuts" role="group" aria-label="Open dock to tab">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="command-strip__shortcut"
          :class="{ 'is-active': dockOpen && activeTab === tab.id }"
          @click="onTabShortcut(tab.id)"
          :ref="(el) => setTabButtonRef(tab.id, el as HTMLButtonElement | null)"
        >
          {{ tab.shortLabel }}
        </button>
      </div>
      <button
        ref="toggleRef"
        type="button"
        class="command-strip__toggle"
        :class="{ 'is-active': dockOpen }"
        @click="onToggleDock"
      >
        <span class="command-strip__toggle-kicker">E</span>
        Editor
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '@app/store'
import { formatBytes } from '@shared/units'
import { CONTROL_DOCK_TABS, type ControlDockTab } from '../dock/dockTypes'

const props = defineProps<{ dockOpen: boolean; activeTab: ControlDockTab }>()
const emit = defineEmits<{
  (e: 'toggle-dock', trigger: HTMLElement | null): void
  (e: 'select-dock-tab', payload: { tab: ControlDockTab; trigger?: HTMLElement | null }): void
}>()

const store = useAppStore()
const { kpis, unit } = storeToRefs(store)
const tabs = CONTROL_DOCK_TABS

const toggleRef = ref<HTMLButtonElement | null>(null)
const tabButtonRefs = reactive<Record<ControlDockTab, HTMLButtonElement | null>>({
  gpus: null,
  models: null,
  workload: null,
})

function setTabButtonRef(tab: ControlDockTab, el: HTMLButtonElement | null) {
  tabButtonRefs[tab] = el
}

const formattedCapacity = computed(() => formatBytes(kpis.value.totalCapacity, unit.value, 1))

function onToggleDock() {
  emit('toggle-dock', toggleRef.value)
}

function onTabShortcut(tab: ControlDockTab) {
  emit('select-dock-tab', { tab, trigger: tabButtonRefs[tab] ?? toggleRef.value ?? null })
}
</script>

<style scoped>
.command-strip {
  position: sticky;
  top: 0;
  z-index: 30;
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) auto;
  align-items: center;
  gap: 1.5rem;
  padding: 1.1rem 1.75rem;
  background: linear-gradient(90deg, rgba(10, 16, 27, 0.9), rgba(24, 33, 54, 0.92));
  border-bottom: 1px solid rgba(148, 163, 184, 0.25);
  backdrop-filter: blur(12px);
}

.command-strip__brand {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.command-strip__glyph {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-size: 1.2rem;
  color: rgba(56, 189, 248, 0.95);
  background: linear-gradient(180deg, rgba(56, 189, 248, 0.16), rgba(20, 184, 166, 0.18));
  box-shadow: 0 0 22px rgba(56, 189, 248, 0.25);
}

.command-strip__eyebrow {
  margin: 0;
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.8);
}

.command-strip__brand h1 {
  margin: 0.25rem 0 0;
  font-size: 1.25rem;
  letter-spacing: 0.02em;
  color: #f8fafc;
}

.command-strip__summary {
  display: flex;
  justify-content: center;
  gap: 1.35rem;
  padding: 0.6rem 1.15rem;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(15, 23, 42, 0.6);
}

.command-strip__stat {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 4.5rem;
  text-align: center;
}

.command-strip__stat-label {
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.75);
}

.command-strip__stat-value {
  font-size: 1.1rem;
  font-weight: 600;
  color: #f8fafc;
}

.command-strip__stat--warnings.has-alert .command-strip__stat-value {
  color: #f97316;
}

.command-strip__actions {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.command-strip__shortcuts {
  display: flex;
  gap: 0.35rem;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 999px;
  padding: 0.25rem;
}

.command-strip__shortcut {
  border: none;
  background: transparent;
  color: rgba(226, 232, 240, 0.85);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  padding: 0.45rem 0.85rem;
  border-radius: 999px;
}

.command-strip__shortcut.is-active {
  background: linear-gradient(90deg, rgba(34, 211, 238, 0.16), rgba(99, 102, 241, 0.2));
  color: #f8fafc;
}

.command-strip__toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.65rem 1.35rem;
  border-radius: 999px;
  border: 1px solid rgba(56, 189, 248, 0.5);
  background: linear-gradient(90deg, rgba(56, 189, 248, 0.22), rgba(99, 102, 241, 0.32));
  color: #f8fafc;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.command-strip__toggle.is-active {
  box-shadow: 0 0 22px rgba(56, 189, 248, 0.35);
}

.command-strip__toggle-kicker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.65rem;
  height: 1.65rem;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid rgba(148, 163, 184, 0.35);
  font-size: 0.72rem;
  font-weight: 700;
}

@media (max-width: 1080px) {
  .command-strip {
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
    grid-template-rows: auto auto;
  }

  .command-strip__actions {
    justify-self: end;
  }

  .command-strip__summary {
    justify-self: start;
  }
}

@media (max-width: 820px) {
  .command-strip {
    grid-template-columns: 1fr;
    grid-template-rows: repeat(3, auto);
    gap: 1rem;
  }

  .command-strip__summary {
    justify-content: flex-start;
  }

  .command-strip__actions {
    justify-content: space-between;
  }
}

@media (max-width: 640px) {
  .command-strip {
    padding: 1rem 1.1rem;
  }

  .command-strip__summary {
    width: 100%;
    gap: 0.85rem;
    padding: 0.5rem 0.85rem;
  }

  .command-strip__actions {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }

  .command-strip__shortcuts {
    justify-content: space-between;
  }

  .command-strip__toggle {
    justify-content: center;
    width: 100%;
  }
}
</style>

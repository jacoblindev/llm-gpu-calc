<template>
  <header class="command-strip" role="banner">
    <div class="command-strip__brand">
      <div class="command-strip__glyph" aria-hidden="true">◇</div>
      <div class="command-strip__titles">
        <p class="command-strip__eyebrow">LLM GPU vRAM Calculator</p>
        <h1>Viz Command Center</h1>
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
        aria-label="Toggle editor drawer"
      >
        <span class="command-strip__toggle-kicker">E</span>
        <span class="command-strip__toggle-label">Editor</span>
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { CONTROL_DOCK_TABS, type ControlDockTab } from '../dock/dockTypes'

const props = defineProps<{ dockOpen: boolean; activeTab: ControlDockTab }>()
const emit = defineEmits<{
  (e: 'toggle-dock', trigger: HTMLElement | null): void
  (e: 'select-dock-tab', payload: { tab: ControlDockTab; trigger?: HTMLElement | null }): void
}>()

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
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 1.2rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(90deg, rgba(10, 16, 27, 0.82), rgba(21, 31, 52, 0.88));
  border-bottom: 1px solid rgba(86, 108, 147, 0.35);
  backdrop-filter: blur(14px);
}

.command-strip__brand {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.command-strip__glyph {
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 1.2rem;
  color: rgba(56, 189, 248, 0.92);
  background: linear-gradient(180deg, rgba(56, 189, 248, 0.2), rgba(110, 108, 236, 0.18));
  box-shadow: 0 0 18px rgba(56, 189, 248, 0.25);
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

.command-strip__titles {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.command-strip__actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.command-strip__shortcuts {
  display: flex;
  gap: 0.35rem;
  background: rgba(15, 24, 40, 0.4);
  border: 1px solid rgba(148, 163, 184, 0.2);
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
  background: linear-gradient(90deg, rgba(34, 211, 238, 0.18), rgba(99, 102, 241, 0.2));
  color: rgba(248, 250, 252, 0.95);
}

.command-strip__toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 1.2rem;
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

.command-strip__toggle-label {
  display: inline-block;
}

@media (max-width: 820px) {
  .command-strip {
    grid-template-columns: 1fr;
    gap: 0.75rem;
    }
  .command-strip__actions {
    justify-content: space-between;
  }

  .command-strip__toggle {
    padding: 0.5rem 0.85rem;
  }

  .command-strip__toggle-label {
    display: none;
  }
}
</style>

<template>
  <Teleport to="body">
    <transition name="insights-fade">
      <button
        v-if="open"
        type="button"
        class="insights__scrim"
        aria-hidden="true"
        tabindex="-1"
        @click="onClose"
      />
    </transition>
    <transition name="insights-slide">
      <aside
        v-if="open"
        ref="rootRef"
        class="insights"
        role="dialog"
        aria-modal="true"
        aria-labelledby="insights-title"
        data-test="insights-drawer"
        @keydown.capture="onKeydown"
      >
        <header class="insights__header">
          <div class="insights__titles">
            <span class="insights__eyebrow">System Insights</span>
            <h2 id="insights-title">Fit Status Overview</h2>
            <p class="insights__subtitle">Monitor capacity pressure across selected GPUs.</p>
          </div>
          <button type="button" class="insights__close" aria-label="Close Insights" @click="onClose">
            <svg aria-hidden="true" viewBox="0 0 16 16" class="insights__close-icon">
              <path d="M3.2 3.2L12.8 12.8M12.8 3.2L3.2 12.8" />
            </svg>
          </button>
        </header>

        <section class="insights__content" aria-live="polite" aria-busy="false">
          <template v-if="rows.length">
            <article v-for="row in rows" :key="row.id" class="insights__row">
              <div class="insights__row-head">
                <div>
                  <h3 class="insights__row-name">{{ row.name }}</h3>
                  <p class="insights__row-reason">{{ row.reason }}</p>
                </div>
                <span :class="['insights__badge', `is-${row.badge.variant}`]" :title="row.badge.title">
                  {{ row.badge.label }}
                </span>
              </div>
              <dl class="insights__metrics">
                <div>
                  <dt>Used</dt>
                  <dd>{{ row.usedLabel }}</dd>
                </div>
                <div>
                  <dt>Free</dt>
                  <dd>{{ row.freeLabel }}</dd>
                </div>
              </dl>
            </article>
          </template>
          <p v-else class="insights__empty">No GPUs selected yet. Pick a GPU to see fit diagnostics.</p>
        </section>
      </aside>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '@app/store'
import { buildInsightRows } from './insightsRows'
import { FOCUSABLE_SELECTOR, getNextFocusable, isFocusableCandidate } from './focusLoop'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const rootRef = ref<HTMLElement | null>(null)
const store = useAppStore()
const { fitStatus, gpus, gpuCatalog, unit } = storeToRefs(store)

const rows = computed(() =>
  buildInsightRows({
    fit: fitStatus.value ?? [],
    gpus: gpus.value,
    gpuCatalog: gpuCatalog.value,
    unit: unit.value,
  })
)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    nextTick(() => {
      const focusable = getFocusableElements()
      if (focusable.length) focusable[0].focus()
    })
  }
)

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

function onClose() {
  emit('close')
}
</script>

<style scoped>
.insights__scrim {
  position: fixed;
  inset: 0;
  background: rgba(9, 12, 18, 0.46);
  backdrop-filter: blur(12px);
  z-index: 40;
  border: none;
  cursor: pointer;
}

.insights {
  position: fixed;
  top: 0;
  bottom: 0;
  right: 0;
  width: min(520px, 62vw);
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.96) 0%, rgba(9, 13, 21, 0.96) 100%);
  border-left: 1px solid rgba(148, 163, 184, 0.28);
  box-shadow: 0 20px 60px rgba(7, 10, 18, 0.55);
  z-index: 41;
  display: flex;
  flex-direction: column;
  color: rgba(248, 250, 252, 0.95);
}

.insights__header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 1rem;
  padding: 1.25rem 1.5rem 1rem;
}

.insights__titles {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.insights__eyebrow {
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.85);
}

.insights__titles h2 {
  margin: 0;
  font-size: 1.35rem;
  letter-spacing: 0.01em;
}

.insights__subtitle {
  margin: 0;
  font-size: 0.85rem;
  color: rgba(226, 232, 240, 0.88);
}

.insights__close {
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(15, 23, 42, 0.45);
  color: rgba(248, 250, 252, 0.92);
  width: 2.35rem;
  aspect-ratio: 1 / 1;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.insights__close:hover {
  border-color: rgba(148, 163, 184, 0.6);
  background: rgba(31, 41, 55, 0.6);
}

.insights__close-icon {
  width: 1.15rem;
  height: 1.15rem;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
}

.insights__content {
  flex: 1;
  overflow-y: auto;
  padding: 0 1.5rem 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.insights__row {
  padding: 1rem 1.1rem;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.insights__row-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: start;
}

.insights__row-name {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: rgba(248, 250, 252, 0.94);
}

.insights__row-reason {
  margin: 0.35rem 0 0;
  font-size: 0.85rem;
  color: rgba(226, 232, 240, 0.88);
}

.insights__badge {
  padding: 0.2rem 0.7rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  border: 1px solid transparent;
}

.insights__badge.is-ok {
  border-color: rgba(48, 209, 88, 0.5);
  color: #30d158;
  background: rgba(48, 209, 88, 0.12);
}

.insights__badge.is-warn {
  border-color: rgba(255, 159, 10, 0.55);
  color: #ffb020;
  background: rgba(255, 159, 10, 0.16);
}

.insights__badge.is-over {
  border-color: rgba(255, 83, 73, 0.65);
  color: #ff4d4f;
  background: rgba(255, 83, 73, 0.18);
}

.insights__metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
}

.insights__metrics dt {
  font-size: 0.74rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.78);
  margin: 0;
}

.insights__metrics dd {
  margin: 0.2rem 0 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: rgba(248, 250, 252, 0.94);
}

.insights__empty {
  margin: 2rem 0;
  text-align: center;
  color: rgba(148, 163, 184, 0.85);
}

.insights-fade-enter-active,
.insights-fade-leave-active {
  transition: opacity 160ms ease;
}

.insights-fade-enter-from,
.insights-fade-leave-to {
  opacity: 0;
}

.insights-slide-enter-active,
.insights-slide-leave-active {
  transition: transform 200ms ease, opacity 200ms ease;
}

.insights-slide-enter-from,
.insights-slide-leave-to {
  transform: translateX(16px);
  opacity: 0;
}

@media (max-width: 960px) {
  .insights {
    width: min(100vw, 540px);
  }
}

@media (max-width: 768px) {
  .insights {
    left: 0;
    width: 100vw;
    border-left: none;
    border-top: 1px solid rgba(148, 163, 184, 0.28);
    border-radius: 24px 24px 0 0;
    box-shadow: 0 20px 60px rgba(7, 10, 18, 0.45);
  }
}
</style>

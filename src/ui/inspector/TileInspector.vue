<template>
  <Teleport to="body">
    <transition name="inspector-fade">
      <button
        v-if="open"
        type="button"
        class="inspector__scrim"
        aria-hidden="true"
        tabindex="-1"
        @click="emitClose"
      />
    </transition>
    <transition name="inspector-zoom">
      <section
        v-if="open"
        ref="rootRef"
        class="inspector"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inspector-title"
        data-test="tile-inspector"
        @keydown.capture="onKeydown"
      >
        <header class="inspector__header">
          <div class="inspector__titles">
            <span class="inspector__eyebrow">GPU Inspector</span>
            <h2 id="inspector-title">{{ selection?.name ?? 'GPU details' }}</h2>
            <p class="inspector__subtitle">Review capacity usage and per-deployment breakdown.</p>
          </div>
          <button type="button" class="inspector__close" aria-label="Close inspector" @click="emitClose">
            <svg aria-hidden="true" viewBox="0 0 16 16" class="inspector__close-icon">
              <path d="M3.2 3.2L12.8 12.8M12.8 3.2L3.2 12.8" />
            </svg>
          </button>
        </header>

        <div class="inspector__body" role="document">
          <template v-if="selection">
            <div v-if="rows.length" class="inspector__cards">
              <article v-for="row in rows" :key="row.id" class="inspector__card">
                <header class="inspector__card-head">
                  <span class="inspector__card-deployment">{{ row.id }}</span>
                  <span class="inspector__card-model">{{ row.modelName }}</span>
                </header>
                <dl class="inspector__card-metrics">
                  <div>
                    <dt>Weights</dt>
                    <dd>{{ row.weights }}</dd>
                  </div>
                  <div>
                    <dt>KV</dt>
                    <dd>{{ row.kv }}</dd>
                  </div>
                </dl>
              </article>
              <article class="inspector__card inspector__card--total">
                <header class="inspector__card-head">
                  <span class="inspector__card-deployment">Totals</span>
                  <span class="inspector__card-model">Across deployments</span>
                </header>
                <dl class="inspector__card-metrics">
                  <div>
                    <dt>Weights</dt>
                    <dd>{{ totals.weights }}</dd>
                  </div>
                  <div>
                    <dt>KV</dt>
                    <dd>{{ totals.kv }}</dd>
                  </div>
                </dl>
              </article>
            </div>
            <p v-else class="inspector__placeholder">No deployments assigned to this GPU yet.</p>

            <section class="inspector__suggestions" aria-live="polite">
              <header class="inspector__suggestions-head">
                <h3>Suggestions</h3>
                <p>Adjust limits to reclaim headroom on this GPU.</p>
              </header>
              <template v-if="suggestions.length">
                <article v-for="suggestion in suggestions" :key="suggestion.id" class="inspector__sugg-card">
                  <header class="inspector__sugg-card-head">
                    <span class="inspector__sugg-deployment">{{ suggestion.id }}</span>
                    <span class="inspector__sugg-model">{{ suggestion.modelName ?? 'Deployment' }}</span>
                  </header>
                  <ul class="inspector__sugg-actions">
                    <li v-for="action in suggestion.actions" :key="action.field" class="inspector__sugg-action">
                      <div>
                        <span class="inspector__sugg-label">{{ action.field === 'max_model_len' ? 'max_model_len' : 'max_num_seqs' }}</span>
                        <span class="inspector__sugg-values">{{ action.current }} → <strong>{{ action.suggested }}</strong></span>
                      </div>
                      <button
                        type="button"
                        class="inspector__apply"
                        :disabled="!action.canApply"
                        @click="applySuggestion(suggestion.id, action.field)"
                      >
                        Apply
                      </button>
                    </li>
                  </ul>
                </article>
              </template>
              <p v-else class="inspector__placeholder">No tuning suggestions for this GPU.</p>
            </section>
          </template>
          <p v-else class="inspector__placeholder">Select a GPU to inspect usage details.</p>
        </div>
      </section>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { FOCUSABLE_SELECTOR, getNextFocusable, isFocusableCandidate } from '../dock/focusLoop'
import { useAppStore } from '@app/store'
import { computeResultsStub } from '@app/controller'
import { formatBytes } from '@shared/units'
import type { AppState } from '@app/state'
import { buildInsightSuggestions } from '../dock/insightsSuggestions'

const props = defineProps<{
  open: boolean
  selection: { id: string; name: string } | null
}>()

const emit = defineEmits<{ (e: 'close'): void }>()
const rootRef = ref<HTMLElement | null>(null)
const store = useAppStore()
const { unit } = storeToRefs(store)

const perGpuResults = computed(() => computeResultsStub(store.$state as AppState))

const rows = computed(() => {
  if (!props.selection) return [] as Array<{ id: string; modelName: string; weights: string; kv: string }>
  const entry = perGpuResults.value.find((result) => result.gpuId === props.selection?.id)
  if (!entry) return []
  return entry.parts.map((part) => ({
    id: part.deploymentId,
    modelName: part.modelName,
    weights: formatBytes(part.weights, unit.value, 1),
    kv: formatBytes(part.kv, unit.value, 1),
  }))
})

const totals = computed(() => {
  if (!props.selection) return { weights: '0', kv: '0' }
  const entry = perGpuResults.value.find((result) => result.gpuId === props.selection?.id)
  if (!entry) return { weights: '0', kv: '0' }
  const weights = entry.parts.reduce((sum, part) => sum + part.weights, 0)
  const kv = entry.parts.reduce((sum, part) => sum + part.kv, 0)
  return {
    weights: formatBytes(weights, unit.value, 1),
    kv: formatBytes(kv, unit.value, 1),
  }
})

const suggestions = computed(() => {
  if (!props.selection) return []
  return buildInsightSuggestions({ state: store.$state as AppState, gpuId: props.selection.id })
})

const focusables = computed(() => {
  const root = rootRef.value
  if (!root) return [] as HTMLElement[]
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isFocusableCandidate)
})

watch(
  () => props.open,
  (open) => {
    if (!open) return
    nextTick(() => {
      const next = focusables.value[0]
      next?.focus()
    })
  }
)

function emitClose() {
  emit('close')
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    emitClose()
    return
  }
  if (event.key !== 'Tab') return
  const current = document.activeElement as HTMLElement | null
  const next = getNextFocusable(focusables.value, current, event.shiftKey)
  if (!next) return
  event.preventDefault()
  next.focus()
}

function applySuggestion(id: string, field: 'max_model_len' | 'max_num_seqs') {
  if (field === 'max_model_len') {
    store.applySuggestedMaxModelLen(id)
  } else {
    store.applySuggestedMaxNumSeqs(id)
  }
}
</script>

<style scoped>
.inspector__scrim {
  position: fixed;
  inset: 0;
  background: rgba(9, 12, 18, 0.52);
  backdrop-filter: blur(12px);
  z-index: 50;
  border: none;
  cursor: pointer;
}

.inspector {
  position: fixed;
  inset: 0;
  margin: auto;
  width: min(760px, 92vw);
  max-height: 92vh;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(9, 13, 21, 0.98) 100%);
  border-radius: 24px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  box-shadow: 0 24px 80px rgba(7, 10, 18, 0.55);
  display: flex;
  flex-direction: column;
  color: rgba(248, 250, 252, 0.96);
  z-index: 51;
}

.inspector__header {
  display: flex;
  justify-content: space-between;
  gap: 1.25rem;
  padding: 1.75rem 2rem 1.2rem;
}

.inspector__titles {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.inspector__eyebrow {
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.82);
}

.inspector__subtitle {
  margin: 0;
  font-size: 0.85rem;
  color: rgba(226, 232, 240, 0.85);
}

.inspector__close {
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(15, 23, 42, 0.45);
  color: rgba(248, 250, 252, 0.92);
  width: 2.5rem;
  aspect-ratio: 1 / 1;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.inspector__close:hover {
  border-color: rgba(148, 163, 184, 0.6);
  background: rgba(31, 41, 55, 0.6);
}

.inspector__close-icon {
  width: 1.2rem;
  height: 1.2rem;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
}


.inspector__body {
  flex: 1;
  padding: 0 2rem 2rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.inspector__cards {
  display: grid;
  gap: 1rem;
}

.inspector__card {
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  background: linear-gradient(135deg, rgba(24, 31, 49, 0.9) 0%, rgba(12, 16, 27, 0.9) 100%);
  padding: 1.1rem 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  box-shadow: 0 12px 30px rgba(7, 10, 18, 0.35);
}

.inspector__card--total {
  border-color: rgba(56, 189, 248, 0.55);
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.18) 0%, rgba(99, 102, 241, 0.18) 100%);
}

.inspector__card-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: baseline;
}

.inspector__card-deployment {
  font-size: 0.88rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.85);
}

.inspector__card-model {
  font-size: 1.05rem;
  font-weight: 600;
  color: rgba(248, 250, 252, 0.94);
}

.inspector__card-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
}

.inspector__card-metrics dt {
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.78);
  margin: 0 0 0.25rem;
}

.inspector__card-metrics dd {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: rgba(248, 250, 252, 0.96);
}

.inspector__suggestions {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.inspector__suggestions-head h3 {
  margin: 0;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(148, 163, 184, 0.85);
}

.inspector__suggestions-head p {
  margin: 0.25rem 0 0;
  font-size: 0.82rem;
  color: rgba(148, 163, 184, 0.78);
}

.inspector__sugg-card {
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  background: linear-gradient(135deg, rgba(24, 31, 49, 0.9) 0%, rgba(12, 16, 27, 0.9) 100%);
  padding: 1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.inspector__sugg-card-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: baseline;
}

.inspector__sugg-deployment {
  font-size: 0.82rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.82);
}

.inspector__sugg-model {
  font-size: 1rem;
  font-weight: 600;
  color: rgba(248, 250, 252, 0.94);
}

.inspector__sugg-actions {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.65rem;
}

.inspector__sugg-action {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
}

.inspector__sugg-label {
  display: block;
  font-size: 0.74rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.78);
}

.inspector__sugg-values {
  font-size: 0.95rem;
  color: rgba(248, 250, 252, 0.95);
}

.inspector__apply {
  border-radius: 999px;
  border: 1px solid rgba(56, 189, 248, 0.5);
  background: linear-gradient(90deg, rgba(56, 189, 248, 0.22), rgba(99, 102, 241, 0.32));
  color: #f8fafc;
  font-weight: 600;
  padding: 0.4rem 1.05rem;
}

.inspector__apply:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.inspector__placeholder {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  text-align: center;
  font-size: 1rem;
  color: rgba(148, 163, 184, 0.85);
}

.inspector__placeholder-sub {
  font-size: 0.82rem;
  color: rgba(148, 163, 184, 0.82);
}

.inspector-fade-enter-active,
.inspector-fade-leave-active {
  transition: opacity 160ms ease;
}

.inspector-fade-enter-from,
.inspector-fade-leave-to {
  opacity: 0;
}

.inspector-zoom-enter-active,
.inspector-zoom-leave-active {
  transition: transform 200ms ease, opacity 200ms ease;
}

.inspector-zoom-enter-from,
.inspector-zoom-leave-to {
  transform: scale(0.96);
  opacity: 0;
}

@media (max-width: 768px) {
  .inspector {
    width: 100vw;
    height: 100vh;
    max-height: none;
    border-radius: 0;
    border: none;
  }

  .inspector__header {
    padding: 1.5rem 1.5rem 1rem;
  }

  .inspector__body {
    padding: 0 1.5rem 1.5rem;
  }
}
</style>

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
          <p v-if="!selection" class="inspector__placeholder">Select a GPU to inspect usage details.</p>
          <div v-else class="inspector__placeholder">
            <strong>{{ selection.name }}</strong>
            <span class="inspector__placeholder-sub">Detailed metrics arrive in Task 5.2.</span>
          </div>
        </div>
      </section>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { FOCUSABLE_SELECTOR, getNextFocusable, isFocusableCandidate } from '../dock/focusLoop'

const props = defineProps<{
  open: boolean
  selection: { id: string; name: string } | null
}>()

const emit = defineEmits<{ (e: 'close'): void }>()
const rootRef = ref<HTMLElement | null>(null)

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
  align-items: center;
  justify-content: center;
}

.inspector__placeholder {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  text-align: center;
  font-size: 1rem;
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

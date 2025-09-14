<template>
  <header class="sticky-header">
    <div class="inner">
      <h1 class="title" aria-label="Application title">
        <span class="hidden sm:inline">LLM GPU vRAM Calculator</span>
        <span class="sm:hidden">vRAM Calc</span>
      </h1>
      <div class="actions">
        <button class="btn" @click="toggleUnit" :aria-label="`Toggle units (current ${state.unit})`" title="Toggle units">
          Units: {{ state.unit }}
        </button>
        <button class="btn" @click="$emit('toggle-theme')">
          Toggle {{ dark ? 'Light' : 'Dark' }}
        </button>
      </div>
    </div>
  </header>
  
</template>

<script setup lang="ts">
import type { AppState } from '@app/state'
import { setUnit } from '@app/controller'

const props = defineProps<{ dark: boolean; state: AppState }>()
defineEmits<{ (e: 'toggle-theme'): void }>()

function toggleUnit() {
  const next = props.state.unit === 'GiB' ? 'GB' : 'GiB'
  setUnit(props.state, next)
}
</script>

<style scoped>
.sticky-header {
  position: sticky;
  top: 0;
  z-index: 40;
  backdrop-filter: saturate(180%) blur(10px);
  background-color: color-mix(in srgb, var(--color-surface) 88%, transparent);
  border-bottom: 1px solid var(--border-color);
}
.inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem; /* 12px vert, 24px horiz */
}
.title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
}
.actions { display: flex; align-items: center; gap: 0.5rem; }
.btn {
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  background: var(--color-surface);
  border: 1px solid var(--border-color);
  color: var(--color-text);
  transition: background-color 180ms ease, color 180ms ease, border-color 180ms ease, transform 180ms ease;
}
.btn:active { transform: translateY(1px); }
.btn:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
</style>

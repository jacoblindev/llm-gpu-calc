<template>
  <div class="viz-controls" role="region" aria-label="Visualization controls">
    <div class="viz-controls__primary">
      <div class="chip-group" role="group" aria-label="Sort GPUs">
        <span class="chip-group__label">Sort</span>
        <button
          v-for="option in sortOptions"
          :key="option.value"
          type="button"
          class="chip"
          :class="{ 'is-active': viewPrefs.sort === option.value }"
          :aria-pressed="viewPrefs.sort === option.value"
          @click="setSort(option.value)"
        >
          {{ option.label }}
        </button>
      </div>

      <div class="chip-group" role="group" aria-label="Filter by status">
        <span class="chip-group__label">Status</span>
        <button
          v-for="option in statusOptions"
          :key="option.value"
          type="button"
          class="chip"
          :class="{ 'is-active': viewPrefs.statusFilter === option.value }"
          :aria-pressed="viewPrefs.statusFilter === option.value"
          @click="setStatusFilter(option.value)"
        >
          {{ option.label }}
        </button>
      </div>

      <div class="chip-group" role="group" aria-label="Filter by vendor">
        <span class="chip-group__label">Vendor</span>
        <button
          v-for="option in vendorOptions"
          :key="option.value"
          type="button"
          class="chip"
          :class="{ 'is-active': viewPrefs.vendorFilter === option.value }"
          :aria-pressed="viewPrefs.vendorFilter === option.value"
          @click="setVendor(option.value)"
        >
          {{ option.label }}
        </button>
      </div>

      <div class="chip-group" role="group" aria-label="Set grid density">
        <span class="chip-group__label">Density</span>
        <button
          v-for="option in densityOptions"
          :key="option.value"
          type="button"
          class="chip"
          :class="{ 'is-active': viewPrefs.density === option.value }"
          :aria-pressed="viewPrefs.density === option.value"
          @click="setDensity(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <Legend class="viz-controls__legend" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '@app/store'
import Legend from '@ui/Legend.vue'

const store = useAppStore()
const { viewPrefs, gpuCatalog } = storeToRefs(store)

const sortOptions = [
  { value: 'status_used', label: 'Status → Used%' },
  { value: 'used_desc', label: 'Used% ↓' },
  { value: 'name_asc', label: 'Name A→Z' },
]

const statusOptions = [
  { value: 'all', label: 'All' },
  { value: 'ok', label: 'OK' },
  { value: 'warn', label: 'Warnings' },
  { value: 'over', label: 'Over' },
]

const densityOptions = [
  { value: '10x10', label: 'Comfort' },
  { value: '20x20', label: 'Compact' },
]

const vendorOptions = computed(() => {
  const vendors = new Set<string>()
  for (const gpu of gpuCatalog.value) {
    if (gpu.vendor) vendors.add(gpu.vendor)
  }
  return [
    { value: '', label: 'All' },
    ...Array.from(vendors).sort().map((v) => ({ value: v, label: v })),
  ]
})

function setSort(value: string) {
  if (viewPrefs.value.sort === value) return
  store.setSort(value)
}

function setStatusFilter(value: string) {
  if (viewPrefs.value.statusFilter === value) return
  store.setStatusFilter(value)
}

function setVendor(value: string) {
  if (viewPrefs.value.vendorFilter === value) return
  store.setVendorFilter(value)
}

function setDensity(value: '10x10' | '20x20') {
  if (viewPrefs.value.density === value) return
  store.setDensity(value)
}
</script>

<style scoped>
.viz-controls {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.5rem;
  padding: 0.75rem 1rem;
  backdrop-filter: blur(12px);
  background: color-mix(in srgb, var(--color-surface, #f5f5f7) 90%, transparent);
  border-bottom: 1px solid rgba(148, 163, 184, 0.35);
}

.viz-controls__primary {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
}

.chip-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.chip-group__label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-muted, #6e6e73);
}

.chip {
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 999px;
  padding: 0.25rem 0.65rem;
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--color-muted, #6e6e73);
  background: rgba(255, 255, 255, 0.6);
  transition: all 0.15s ease;
}

.chip:hover {
  border-color: rgba(148, 163, 184, 0.6);
  color: var(--color-text, #1d1d1f);
}

.chip:focus-visible {
  outline: 2px solid var(--color-primary, #0071e3);
  outline-offset: 2px;
}

.chip.is-active {
  border-color: var(--color-primary, #0071e3);
  color: var(--color-primary, #0071e3);
  background: rgba(0, 113, 227, 0.08);
}

.viz-controls__legend {
  margin-left: auto;
  display: flex;
  align-items: center;
  min-width: 200px;
}

@media (max-width: 960px) {
  .viz-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .viz-controls__legend {
    justify-content: flex-start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .chip,
  .chip:hover {
    transition: none;
  }
}
</style>


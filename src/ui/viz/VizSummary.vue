<template>
  <section class="viz-summary" role="group" aria-label="Current system snapshot">
    <template v-for="chip in chips" :key="chip.id">
      <button
        v-if="chip.kind === 'action'"
        type="button"
        class="viz-summary__chip is-action"
        :class="[`is-${chip.variant}`, { 'has-alert': chip.alert }]"
        @click="onChipClick(chip)"
      >
        <span class="viz-summary__label">{{ chip.label }}</span>
        <span class="viz-summary__value">{{ chip.value }}</span>
      </button>
      <div
        v-else
        class="viz-summary__chip"
        :class="[`is-${chip.variant}`]"
      >
        <span class="viz-summary__label">{{ chip.label }}</span>
        <span class="viz-summary__value">{{ chip.value }}</span>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '@app/store'
import { formatKpiBytes, formatKpiNumber } from '../shell/kpiHelpers'

const emit = defineEmits<{ (e: 'open-warnings'): void }>()

const store = useAppStore()
const { kpis, unit } = storeToRefs(store)

type Chip = {
  id: string
  label: string
  value: string
  kind: 'stat' | 'action'
  variant: 'neutral' | 'accent' | 'warn'
  alert?: boolean
}

const chips = computed<Chip[]>(() => {
  const warnings = Number(kpis.value.warnings ?? 0)
  return [
    {
      id: 'gpus',
      label: 'GPUs',
      value: formatKpiNumber(kpis.value.gpus),
      kind: 'stat',
      variant: 'neutral',
    },
    {
      id: 'capacity',
      label: 'Capacity',
      value: formatKpiBytes(kpis.value.totalCapacity, unit.value),
      kind: 'stat',
      variant: 'accent',
    },
    {
      id: 'used',
      label: 'Used',
      value: formatKpiBytes(kpis.value.totalUsed, unit.value),
      kind: 'stat',
      variant: 'neutral',
    },
    {
      id: 'reserve',
      label: 'Reserve',
      value: formatKpiBytes(kpis.value.totalReserve, unit.value),
      kind: 'stat',
      variant: 'neutral',
    },
    {
      id: 'warnings',
      label: 'Warnings',
      value: formatKpiNumber(warnings),
      kind: 'action',
      variant: 'warn',
      alert: warnings > 0,
    },
  ]
})

function onChipClick(chip: Chip) {
  if (chip.id === 'warnings') {
    emit('open-warnings')
  }
}
</script>

<style scoped>

.viz-summary {
  display: flex;
  gap: 0.6rem;
  padding: 0.35rem 0.45rem;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.viz-summary::-webkit-scrollbar {
  display: none;
}

.viz-summary__chip {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 104px;
  padding: 0.45rem 0.7rem;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 42, 0.78);
  color: rgba(236, 244, 255, 0.94);
  text-align: left;
}

.viz-summary__chip.is-accent {
  border-color: rgba(56, 189, 248, 0.4);
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.16), rgba(99, 102, 241, 0.16));
  color: rgba(236, 249, 255, 0.96);
}

.viz-summary__chip.is-action {
  cursor: pointer;
  transition: transform 140ms ease, border-color 160ms ease, background-color 160ms ease;
}

.viz-summary__chip.is-action:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 159, 10, 0.45);
}

.viz-summary__chip.is-warn.has-alert {
  border-color: rgba(255, 159, 10, 0.5);
  background: linear-gradient(135deg, rgba(255, 159, 10, 0.18), rgba(255, 107, 64, 0.16));
}

.viz-summary__label {
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.78);
}

.viz-summary__value {
  font-size: 0.92rem;
  font-weight: 600;
  color: inherit;
}

@media (max-width: 640px) {
  .viz-summary__chip {
    min-width: 100px;
    padding: 0.45rem 0.65rem;
  }

  .viz-summary {
    justify-content: flex-start;
  }
}
</style>

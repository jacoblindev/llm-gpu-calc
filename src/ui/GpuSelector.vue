<template>
  <div class="bg-surface border border-muted/30 rounded-md p-4">
    <h2 class="text-lg font-semibold">Select GPUs</h2>
    <div class="mt-3 grid md:grid-cols-2 lg:grid-cols-3 gap-3">
      <div v-for="t in state.gpuCatalog" :key="t.id" class="border border-muted/30 rounded p-3">
        <div class="font-medium">{{ t.name }}</div>
        <div class="text-sm text-muted">{{ capacity(t) }}</div>
        <div class="mt-2 flex items-center gap-2">
          <button class="px-2 py-1 rounded bg-surface border border-muted/30" @click="dec(t.id)">-</button>
          <input class="w-16 px-2 py-1 bg-bg border border-muted/30 rounded" type="number" min="0" step="1" :value="count(t.id)" @input="onCount(t.id, $event)" />
          <button class="px-2 py-1 rounded bg-surface border border-muted/30" @click="inc(t.id)">+</button>
        </div>
      </div>
    </div>
    <div class="mt-3 text-sm text-muted">Selected: {{ totalSelected }} GPU(s)</div>
  </div>
</template>

<script setup lang="ts">
import type { AppState } from '@app/state'
import { gpuCapacityLabel, incrementGpu, setGpuCount } from '@app/controller'
import { computed } from 'vue'

const props = defineProps<{ state: AppState }>()

function capacity(t: AppState['gpuCatalog'][number]) {
  return gpuCapacityLabel(t)
}
function count(id: string) {
  return props.state.gpuCounts[id] ?? 0
}
function inc(id: string) { incrementGpu(props.state, id, +1) }
function dec(id: string) { incrementGpu(props.state, id, -1) }
function onCount(id: string, e: Event) {
  const v = parseInt((e.target as HTMLInputElement).value, 10)
  setGpuCount(props.state, id, isNaN(v) ? 0 : v)
}

const totalSelected = computed(() => props.state.gpus.length)
</script>

<style scoped></style>


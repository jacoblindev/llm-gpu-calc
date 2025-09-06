<template>
  <div class="bg-surface border border-muted/30 rounded-md p-4 space-y-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">Select Models</h2>
      <button class="px-3 py-1.5 rounded bg-primary text-white" @click="$emit('add')">Add Deployment</button>
    </div>
    <div v-if="state.deployments.length === 0" class="text-muted">No deployments yet. Click “Add Deployment”.</div>
    <div v-for="d in state.deployments" :key="d.id" class="border border-muted/30 rounded p-3">
      <div class="flex items-center justify-between">
        <div class="font-medium">Deployment: {{ d.id }}</div>
        <button class="text-sm text-danger" @click="$emit('remove', d.id)">Remove</button>
      </div>
      <div class="grid md:grid-cols-3 gap-3 mt-3">
        <div>
          <label class="block text-sm text-muted">Model</label>
          <select class="mt-1 w-full px-2 py-1 bg-bg border border-muted/30 rounded" :value="d.modelId" @change="onModelChange(d, $event)">
            <option v-for="m in state.models" :key="m.id" :value="m.id">{{ m.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm text-muted">Utilization U [0..1]</label>
          <input class="mt-1 w-full px-2 py-1 bg-bg border border-muted/30 rounded" type="number" min="0" max="1" step="0.01" :value="d.utilizationShare" @input="onUChange(d, $event)" />
        </div>
        <div class="self-end text-sm text-muted">Selected GPUs: {{ state.gpus.length }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AppState } from '@app/state'

const props = defineProps<{ state: AppState }>()
defineEmits<{ add: []; remove: [id: string] }>()

function onModelChange(d: AppState['deployments'][number], e: Event) {
  const id = (e.target as HTMLSelectElement).value
  d.modelId = id
  const model = props.state.models.find(m => m.id === id)
  if (model) {
    d.weightDtype = model.defaultWeightDtype
    d.kvDtype = model.defaultKvDtype
  }
}
function onUChange(d: AppState['deployments'][number], e: Event) {
  const v = Math.max(0, Math.min(1, parseFloat((e.target as HTMLInputElement).value)))
  d.utilizationShare = Number.isFinite(v) ? v : 0
}
</script>

<style scoped>
.text-danger { color: #dc2626; }
</style>

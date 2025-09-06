<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">Deployments</h2>
      <button class="px-3 py-1.5 rounded bg-primary text-white" @click="$emit('add')">Add Deployment</button>
    </div>
    <div v-if="state.deployments.length === 0" class="text-muted">No deployments yet. Click “Add Deployment”.</div>
    <div v-for="d in state.deployments" :key="d.id" class="border border-muted/30 rounded-md p-3 bg-surface">
      <div class="flex items-start justify-between">
        <div class="font-medium">{{ modelName(d.modelId) || 'Select model' }}</div>
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
          <label class="block text-sm text-muted">Assign GPUs</label>
          <div class="mt-1 max-h-36 overflow-auto border border-muted/30 rounded p-2 space-y-1">
            <label v-for="g in state.gpus" :key="g.id" class="flex items-center gap-2">
              <input type="checkbox" :value="g.id" :checked="d.assignedGpuIds.includes(g.id)" @change="onGpuToggle(d, g.id, $event)" />
              <span>{{ g.name }} — {{ gpuLabel(g) }}</span>
            </label>
          </div>
        </div>
        <div>
          <label class="block text-sm text-muted">TP</label>
          <input class="mt-1 w-full px-2 py-1 bg-bg border border-muted/30 rounded" type="number" min="1" step="1" :value="d.tp" @input="onField(d, 'tp', $event)" />
        </div>
        <div>
          <label class="block text-sm text-muted">Weight dtype</label>
          <select class="mt-1 w-full px-2 py-1 bg-bg border border-muted/30 rounded" :value="d.weightDtype" @change="onField(d, 'weightDtype', $event)">
            <option value="bf16">bf16</option>
            <option value="fp16">fp16</option>
            <option value="fp32">fp32</option>
            <option value="q8">q8</option>
            <option value="q4">q4</option>
          </select>
        </div>
        <div>
          <label class="block text-sm text-muted">KV dtype</label>
          <select class="mt-1 w-full px-2 py-1 bg-bg border border-muted/30 rounded" :value="d.kvDtype" @change="onField(d, 'kvDtype', $event)">
            <option value="bf16">bf16</option>
            <option value="fp16">fp16</option>
            <option value="fp8">fp8</option>
            <option value="int8">int8</option>
          </select>
        </div>
        <div>
          <label class="block text-sm text-muted">KV overhead %</label>
          <input class="mt-1 w-full px-2 py-1 bg-bg border border-muted/30 rounded" type="number" min="0" step="1" :value="Math.round(d.kvOverheadPct*100)" @input="onPct(d, 'kvOverheadPct', $event)" />
        </div>
        <div>
          <label class="block text-sm text-muted">Replication overhead %</label>
          <input class="mt-1 w-full px-2 py-1 bg-bg border border-muted/30 rounded" type="number" min="0" step="1" :value="Math.round(d.replicationOverheadPct*100)" @input="onPct(d, 'replicationOverheadPct', $event)" />
        </div>
        <div>
          <label class="block text-sm text-muted">max_model_len</label>
          <input class="mt-1 w-full px-2 py-1 bg-bg border border-muted/30 rounded" type="number" min="0" step="128" :value="d.maxModelLen" @input="onField(d, 'maxModelLen', $event)" />
        </div>
        <div>
          <label class="block text-sm text-muted">max_num_seqs</label>
          <input class="mt-1 w-full px-2 py-1 bg-bg border border-muted/30 rounded" type="number" min="1" step="1" :value="d.maxNumSeqs" @input="onField(d, 'maxNumSeqs', $event)" />
        </div>
      </div>

      <div class="mt-3">
        <div v-if="errors(d).length" class="text-danger text-sm">{{ errors(d).join('; ') }}</div>
        <div v-else-if="warnings(d).length" class="text-warning text-sm">{{ warnings(d).join('; ') }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AppState } from '@app/state'
import { validateDeployment, gpuCapacityLabel } from '@app/controller'

type Deployment = AppState['deployments'][number]
type Gpu = AppState['gpus'][number]

const props = defineProps<{ state: AppState }>()
defineEmits<{ add: []; remove: [id: string] }>()

function modelName(id: string): string|undefined {
  return props.state.models.find(m => m.id === id)?.name
}
function onModelChange(d: Deployment, e: Event) {
  d.modelId = (e.target as HTMLSelectElement).value
  const model = props.state.models.find(m => m.id === d.modelId)
  if (model) {
    d.weightDtype = model.defaultWeightDtype
    d.kvDtype = model.defaultKvDtype
  }
}
function onGpuToggle(d: Deployment, id: string, e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  const set = new Set(d.assignedGpuIds)
  if (checked) set.add(id)
  else set.delete(id)
  d.assignedGpuIds = Array.from(set)
  // auto-align TP with number of assigned GPUs as requested
  d.tp = Math.max(1, d.assignedGpuIds.length)
}
function onField<T extends keyof Deployment>(d: Deployment, key: T, e: Event) {
  const el = e.target as HTMLInputElement | HTMLSelectElement
  const v = el instanceof HTMLInputElement && el.type === 'number' ? Number(el.value) : (el as HTMLSelectElement).value
  // @ts-expect-error generic assignment
  d[key] = v
  if (key === 'tp') {
    const max = d.assignedGpuIds.length || 1
    d.tp = Math.max(1, Math.min(d.tp, max))
  }
}
function onPct<T extends 'kvOverheadPct'|'replicationOverheadPct'>(d: Deployment, key: T, e: Event) {
  const v = Math.max(0, Number((e.target as HTMLInputElement).value) || 0) / 100
  d[key] = v
}
function gpuLabel(g: Gpu) { return gpuCapacityLabel(g) }
function errors(d: Deployment) { return validateDeployment(d, props.state.gpus).errors }
function warnings(d: Deployment) { return validateDeployment(d, props.state.gpus).warnings }
</script>

<style scoped>
.text-danger { color: #dc2626; }
.text-warning { color: #b45309; }
</style>

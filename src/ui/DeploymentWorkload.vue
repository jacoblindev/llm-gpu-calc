<template>
  <div class="bg-surface border border-muted/30 rounded-md p-4 space-y-3">
    <h2 class="text-lg font-semibold">Configure Workload</h2>
    <div v-if="state.deployments.length === 0" class="text-muted">No deployments defined. Go back and add a model.</div>
    <div v-for="d in state.deployments" :key="d.id" class="border border-muted/30 rounded p-3">
      <div class="font-medium mb-2">{{ modelName(d.modelId) || 'Select model' }}</div>
      <div class="grid md:grid-cols-3 gap-3">
        <div class="md:col-span-1">
          <label class="block text-sm text-muted">Assign GPUs</label>
          <div class="mt-1 max-h-40 overflow-auto border border-muted/30 rounded p-2 space-y-1">
            <label v-for="g in state.gpus" :key="g.id" class="flex items-center gap-2">
              <input type="checkbox" :value="g.id" :checked="d.assignedGpuIds.includes(g.id)" @change="onGpuToggle(d, g.id, $event)" />
              <span>{{ g.name }}</span>
            </label>
          </div>
          <div class="mt-2 text-sm">TP: <span class="font-medium">{{ d.assignedGpuIds.length }}</span></div>
        </div>
        <div>
          <label class="block text-sm text-muted">Weight dtype</label>
          <select class="mt-1 w-full px-2 py-1 bg-bg border border-muted/30 rounded" :value="d.weightDtype" @change="onWeightDtype(d, $event)">
            <option value="bf16">bf16</option>
            <option value="fp16">fp16</option>
            <option value="fp32">fp32</option>
            <option value="q8">q8</option>
            <option value="q4">q4</option>
          </select>
        </div>
        <div>
          <label class="block text-sm text-muted">KV dtype</label>
          <select class="mt-1 w-full px-2 py-1 bg-bg border border-muted/30 rounded" :value="d.kvDtype" @change="onKvDtype(d, $event)">
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
          <div class="mt-1 flex items-stretch gap-1">
            <button class="px-2 py-1 rounded bg-surface border border-muted/30" @click="decLen(d)">-</button>
            <input
              class="w-full px-2 py-1 bg-bg border border-muted/30 rounded"
              type="number" min="0" step="128"
              :value="d.maxModelLen"
              @input="onMaxModelLen(d, $event)"
              @blur="onMaxModelLenBlur(d, $event)"
              @keydown="onLenKey(d, $event)"
            />
            <button class="px-2 py-1 rounded bg-surface border border-muted/30" @click="incLen(d)">+</button>
          </div>
        </div>
        <div>
          <label class="block text-sm text-muted">max_num_seqs</label>
          <div class="mt-1 flex items-stretch gap-1">
            <button class="px-2 py-1 rounded bg-surface border border-muted/30" @click="decSeq(d)">-</button>
            <input
              class="w-full px-2 py-1 bg-bg border border-muted/30 rounded"
              type="number" min="1" step="1"
              :value="d.maxNumSeqs"
              @input="onMaxNumSeqs(d, $event)"
              @blur="onMaxNumSeqsBlur(d, $event)"
              @keydown="onSeqKey(d, $event)"
            />
            <button class="px-2 py-1 rounded bg-surface border border-muted/30" @click="incSeq(d)">+</button>
          </div>
        </div>
      </div>
      <div class="mt-2 text-xs sm:text-sm flex flex-wrap items-center gap-2">
        <span class="text-muted">Suggestion:</span>
        <span
          class="px-2 py-0.5 rounded bg-surface border border-muted/30"
          :title="rawTitleLen(d.id)"
        >max_model_len = {{ suggest(d.id).maxModelLen }}</span>
        <span
          class="px-2 py-0.5 rounded bg-surface border border-muted/30"
          :title="rawTitleSeq(d.id)"
        >max_num_seqs = {{ suggest(d.id).maxNumSeqs }}</span>
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
import { validateDeployment, computeDeploymentSuggestions, computeDeploymentSuggestionsRaw } from '@app/controller'
import type { DType, KvDType } from '@shared/types'
import { normalizeMaxModelLenInput, normalizeMaxNumSeqsInput, stepMaxModelLen, stepMaxNumSeqs, adjustByKey } from '@shared/controls'

const props = defineProps<{ state: AppState }>()

function modelName(id: string) {
  return props.state.models.find(m => m.id === id)?.name
}
function onWeightDtype(d: AppState['deployments'][number], e: Event) {
  d.weightDtype = (e.target as HTMLSelectElement).value as DType
}
function onKvDtype(d: AppState['deployments'][number], e: Event) {
  d.kvDtype = (e.target as HTMLSelectElement).value as KvDType
}
function onMaxModelLen(d: AppState['deployments'][number], e: Event) {
  d.maxModelLen = normalizeMaxModelLenInput(Number((e.target as HTMLInputElement).value))
}
function onMaxNumSeqs(d: AppState['deployments'][number], e: Event) {
  d.maxNumSeqs = normalizeMaxNumSeqsInput(Number((e.target as HTMLInputElement).value))
}
function onMaxModelLenBlur(d: AppState['deployments'][number], e: Event) {
  d.maxModelLen = normalizeMaxModelLenInput(d.maxModelLen)
}
function onMaxNumSeqsBlur(d: AppState['deployments'][number], e: Event) {
  d.maxNumSeqs = normalizeMaxNumSeqsInput(d.maxNumSeqs)
}
function incLen(d: AppState['deployments'][number]) { d.maxModelLen = stepMaxModelLen(d.maxModelLen, +1) }
function decLen(d: AppState['deployments'][number]) { d.maxModelLen = stepMaxModelLen(d.maxModelLen, -1) }
function incSeq(d: AppState['deployments'][number]) { d.maxNumSeqs = stepMaxNumSeqs(d.maxNumSeqs, +1) }
function decSeq(d: AppState['deployments'][number]) { d.maxNumSeqs = stepMaxNumSeqs(d.maxNumSeqs, -1) }
function onLenKey(d: AppState['deployments'][number], e: KeyboardEvent) {
  const v = adjustByKey(d.maxModelLen, e.key, 128, 0)
  if (v !== d.maxModelLen) { d.maxModelLen = v; e.preventDefault() }
}
function onSeqKey(d: AppState['deployments'][number], e: KeyboardEvent) {
  const v = adjustByKey(d.maxNumSeqs, e.key, 1, 1)
  if (v !== d.maxNumSeqs) { d.maxNumSeqs = v; e.preventDefault() }
}
function onPct<T extends 'kvOverheadPct'|'replicationOverheadPct'>(d: AppState['deployments'][number], key: T, e: Event) {
  const v = Math.max(0, Number((e.target as HTMLInputElement).value) || 0) / 100
  d[key] = v
}
function onGpuToggle(d: AppState['deployments'][number], id: string, e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  const set = new Set(d.assignedGpuIds)
  if (checked) set.add(id)
  else set.delete(id)
  d.assignedGpuIds = Array.from(set)
  d.tp = Math.max(1, d.assignedGpuIds.length)
}
function errors(d: AppState['deployments'][number]) { return validateDeployment(d, props.state.gpus).errors }
function warnings(d: AppState['deployments'][number]) { return validateDeployment(d, props.state.gpus).warnings }
function suggest(id: string) { return computeDeploymentSuggestions(props.state, id) }
function rawTitleLen(id: string) {
  const raw = computeDeploymentSuggestionsRaw(props.state, id)
  return `Raw (no safety): max_model_len = ${raw.maxModelLen} // safety 0.98 applied in suggestion`
}
function rawTitleSeq(id: string) {
  const raw = computeDeploymentSuggestionsRaw(props.state, id)
  return `Raw (no safety): max_num_seqs = ${raw.maxNumSeqs} // safety 0.98 applied in suggestion`
}
</script>

<style scoped>
.text-danger { color: #dc2626; }
.text-warning { color: #b45309; }
</style>

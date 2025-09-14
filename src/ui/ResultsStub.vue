<template>
  <div class="space-y-4">
    <div class="bg-surface border rounded-md p-4">
      <h2 class="text-lg font-semibold">Selected GPUs</h2>
      <div v-if="state.gpus.length === 0" class="text-muted mt-2">No GPUs selected.</div>
      <ul v-else class="mt-2 grid md:grid-cols-2 lg:grid-cols-3 gap-2">
        <li v-for="r in results" :key="r.gpuId" class="border rounded p-3">
          <div class="flex items-center justify-between">
            <span>{{ r.gpuName }}</span>
            <span class="text-sm text-muted">{{ format(r.capacityBytes) }}</span>
          </div>
          <div class="mt-1 text-sm">
            <span class="text-muted">ΣU:</span> <span class="font-medium">{{ r.util.toFixed(2) }}</span>
            <span class="ml-3 text-muted">Implied reserve:</span> <span class="font-medium">{{ (r.reserve * 100).toFixed(0) }}%</span>
            <span v-if="r.util > 1" class="ml-2 text-danger">over 100%</span>
            <span v-else-if="r.util > 0.95" class="ml-2 text-warning">high &gt;95%</span>
          </div>
          <div class="mt-1 text-sm">
            <span class="text-muted">Approx used (weights+KV):</span>
            <span class="font-medium">{{ format(r.used) }} ({{ ((r.used / r.capacityBytes) * 100).toFixed(0) }}%)</span>
          </div>
          <div v-if="fit[r.gpuId]" class="mt-1 text-sm">
            <span class="text-muted">Status:</span>
            <span :class="fit[r.gpuId].ok ? 'text-success' : 'text-danger'">{{ fit[r.gpuId].ok ? 'OK' : 'Over' }}</span>
            <span v-if="fit[r.gpuId].reason" :class="['ml-2', reasonStyle(fit[r.gpuId])]">{{ fit[r.gpuId].reason }}</span>
          </div>
        </li>
      </ul>
    </div>

    <div class="bg-surface border rounded-md p-4">
      <h2 class="text-lg font-semibold">Deployments</h2>
      <div v-if="state.deployments.length === 0" class="text-muted mt-2">No deployments configured.</div>
      <div v-for="d in state.deployments" :key="d.id" class="mt-3 border rounded p-3">
        <div class="flex items-center justify-between">
          <div class="font-medium">{{ modelName(d.modelId) || 'Select model' }}</div>
          <div class="text-sm text-muted">Deployment: {{ d.id }}</div>
        </div>
        <div class="mt-2 grid md:grid-cols-3 gap-2 text-sm">
          <div><span class="text-muted">Assigned GPUs:</span> <span class="font-medium">{{ d.assignedGpuIds.length }}</span></div>
          <div><span class="text-muted">TP:</span> <span class="font-medium">{{ d.assignedGpuIds.length }}</span></div>
          <div><span class="text-muted">U share:</span> <span class="font-medium">{{ (uShare(d) * 100).toFixed(0) }}%</span></div>
          <div><span class="text-muted">Workload:</span> <span class="font-medium">{{ d.maxNumSeqs }} seq × {{ d.maxModelLen }} tokens</span></div>
          <div><span class="text-muted">DTypes:</span> <span class="font-medium">weights={{ d.weightDtype }}, kv={{ d.kvDtype }}</span></div>
          <div><span class="text-muted">Overheads:</span> <span class="font-medium">rep={{ pct(d.replicationOverheadPct) }}, kv={{ pct(d.kvOverheadPct) }}</span></div>
          <div class="md:col-span-3">
            <span class="text-muted">GPU list:</span>
            <span class="font-medium">{{ assignedGpuNames(d).join(', ') || '—' }}</span>
          </div>
        </div>
        <div class="mt-2 flex flex-wrap gap-2 text-sm">
          <span class="text-muted">Suggestions:</span>
          <button class="px-2 py-1 rounded bg-surface border"
            @click="applyLen(d.id)">
            max_model_len = {{ suggest(d.id).maxModelLen }}
          </button>
          <button class="px-2 py-1 rounded bg-surface border"
            @click="applySeq(d.id)">
            max_num_seqs = {{ suggest(d.id).maxNumSeqs }}
          </button>
        </div>
        <div class="mt-2 text-sm">
          <span v-if="errors(d).length" class="text-danger">{{ errors(d).join('; ') }}</span>
          <span v-else-if="warnings(d).length" class="text-warning">{{ warnings(d).join('; ') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AppState } from '@app/state'
import { validateDeployment, utilizationByGpu, impliedReserveByGpu, computeResultsStub, buildPerGpuFitStatus, computeDeploymentSuggestions, applySuggestedMaxModelLen, applySuggestedMaxNumSeqs } from '@app/controller'
import { formatBytes } from '@shared/units'
import { computed } from 'vue'

const props = defineProps<{ state: AppState }>()
const util = Object.fromEntries(utilizationByGpu(props.state).entries()) as Record<string, number>
const res = Object.fromEntries(impliedReserveByGpu(props.state).entries()) as Record<string, number>
const results = computed(() => computeResultsStub(props.state).map(r => ({
  gpuId: r.gpuId,
  gpuName: r.gpuName,
  capacityBytes: r.capacityBytes,
  used: r.usedBytes,
  util: r.utilizationSum,
  reserve: r.impliedReserveFrac,
})))
const fit = computed(() => Object.fromEntries(buildPerGpuFitStatus(props.state).map(s => [s.gpuId, s])));
function format(bytes: number) { return formatBytes(bytes, props.state.unit, 1) }

function capacity(g: AppState['gpus'][number]) { return formatBytes(g.vramBytes, props.state.unit, 1) }
function modelName(id: string) { return props.state.models.find(m => m.id === id)?.name }
function pct(v: number) { return `${Math.round((v || 0) * 100)}%` }
function assignedGpuNames(d: AppState['deployments'][number]) {
  const byId = new Map(props.state.gpus.map(g => [g.id, g.name] as const))
  return d.assignedGpuIds.map(id => byId.get(id)).filter(Boolean) as string[]
}
function errors(d: AppState['deployments'][number]) { return validateDeployment(d, props.state.gpus).errors }
function warnings(d: AppState['deployments'][number]) { return validateDeployment(d, props.state.gpus).warnings }
function uShare(d: AppState['deployments'][number]) { return d.utilizationShare ?? 0 }
function suggest(id: string) { return computeDeploymentSuggestions(props.state, id) }
function applyLen(id: string) { applySuggestedMaxModelLen(props.state, id) }
function applySeq(id: string) { applySuggestedMaxNumSeqs(props.state, id) }
function reasonStyle(s: { ok: boolean; reason?: string }) {
  if (s.reason && s.reason.includes('High utilization')) return 'text-warning'
  return s.ok ? 'text-muted' : 'text-danger'
}
</script>

<style scoped>
.text-danger { color: #dc2626; }
.text-warning { color: #b45309; }
.text-muted { color: #6b7280; }
</style>

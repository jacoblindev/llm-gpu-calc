<template>
  <aside class="bg-surface border rounded-md p-4">
    <h2 class="text-lg font-semibold">Results Preview</h2>
    <div v-if="state.deployments.length > 0" class="mt-2 flex flex-wrap items-center gap-2 text-sm">
      <label class="text-muted">Active deployment:</label>
      <select v-model="activeId" class="px-2 py-1 bg-bg border rounded">
        <option v-for="d in state.deployments" :key="d.id" :value="d.id">{{ modelName(d.modelId) || d.id }}</option>
      </select>
      <div class="ml-auto flex items-stretch gap-1">
        <div class="hidden sm:flex items-center gap-2">
          <span class="text-muted">len</span>
          <button class="px-2 py-1 rounded bg-surface border" @click="decLen()">-</button>
          <div class="flex flex-col">
            <input class="w-24 px-2 py-1 bg-bg border rounded" type="number" min="0" step="128" v-model.number="len" @blur="onLenBlur" @keydown="onLenKey" />
            <span v-if="lenErr" class="text-[11px] text-danger">{{ lenErr }}</span>
          </div>
          <span class="text-muted">seqs</span>
          <button class="px-2 py-1 rounded bg-surface border" @click="decSeq()">-</button>
          <div class="flex flex-col">
            <input class="w-16 px-2 py-1 bg-bg border rounded" type="number" min="1" step="1" v-model.number="seqs" @blur="onSeqBlur" @keydown="onSeqKey" />
            <span v-if="seqErr" class="text-[11px] text-danger">{{ seqErr }}</span>
          </div>
        </div>
        <button class="px-2 py-1 rounded bg-primary text-white disabled:opacity-50" :disabled="!canApply" @click="apply">Apply</button>
      </div>
    </div>
    <div class="mt-2">
      <!-- Bars recompute from temporary overrides without mutating App state -->
      <PerGpuBars :bars="previewBars" />
    </div>
  </aside>
</template>

<script setup lang="ts">
import type { AppState } from '@app/state'
import PerGpuBars from '@ui/PerGpuBars.vue'
import { computed, reactive, watch, ref } from 'vue'
import { buildPerGpuBarsWithOverrides, type DeploymentOverride } from '@app/controller'
import { normalizeMaxModelLenInput, normalizeMaxNumSeqsInput, stepMaxModelLen, stepMaxNumSeqs, adjustByKey, validateMaxModelLen, validateMaxNumSeqs } from '@shared/controls'

const props = defineProps<{ state: AppState }>()

function modelName(id: string) { return props.state.models.find(m => m.id === id)?.name }

// Active deployment selection
const activeId = ref<string | null>(props.state.deployments[0]?.id ?? null)
watch(() => props.state.deployments.length, (n) => {
  if (n > 0 && !activeId.value) activeId.value = props.state.deployments[0]?.id ?? null
})

// Temporary UI state for adjustable preview
const temp = reactive({ len: 0, seqs: 1 })

// Seed from current state when active changes
watch(() => activeId.value, (id) => {
  const d = props.state.deployments.find(x => x.id === id!)
  temp.len = d?.maxModelLen ?? 0
  temp.seqs = d?.maxNumSeqs ?? 1
})

const len = computed({ get: () => temp.len, set: (v: number) => temp.len = Math.floor(v || 0) })
const seqs = computed({ get: () => temp.seqs, set: (v: number) => temp.seqs = Math.floor(v || 1) })

const lenErr = computed(() => validateMaxModelLen(len.value))
const seqErr = computed(() => validateMaxNumSeqs(seqs.value))

const overrides = computed<DeploymentOverride[]>(() => activeId.value ? [{ id: activeId.value, maxModelLen: len.value, maxNumSeqs: seqs.value }] : [])
const previewBars = computed(() => buildPerGpuBarsWithOverrides(props.state, overrides.value))

const canApply = computed(() => !!activeId.value && !lenErr.value && !seqErr.value)

function onLenBlur() { len.value = normalizeMaxModelLenInput(len.value) }
function onSeqBlur() { seqs.value = normalizeMaxNumSeqsInput(seqs.value) }
function decLen() { len.value = stepMaxModelLen(len.value, -1) }
function decSeq() { seqs.value = stepMaxNumSeqs(seqs.value, -1) }
function onLenKey(e: KeyboardEvent) { const v = adjustByKey(len.value, e.key, 128, 0); if (v !== len.value) { len.value = v; e.preventDefault() } }
function onSeqKey(e: KeyboardEvent) { const v = adjustByKey(seqs.value, e.key, 1, 1); if (v !== seqs.value) { seqs.value = v; e.preventDefault() } }
function apply() {
  if (!activeId.value) return
  const d = props.state.deployments.find(x => x.id === activeId.value)
  if (!d) return
  d.maxModelLen = len.value
  d.maxNumSeqs = seqs.value
}
</script>

<style scoped>
.text-danger { color: var(--color-danger); }
</style>

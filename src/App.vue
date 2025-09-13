<template>
  <main class="min-h-dvh bg-bg text-text flex flex-col">
    <TopBar :dark="dark" :state="state" @toggle-theme="dark = !dark" />
    <section class="mt-4 mb-6 space-y-4 px-6">
      <Stepper :steps="steps" :current="currentStep" />
      <div class="grid gap-4 lg:grid-cols-[2fr_1fr] items-start">
        <!-- Main column -->
        <div class="space-y-4">
          <div v-if="currentStep === 0" class="space-y-4">
            <GpuSelector :state="state" />
          </div>
          <div v-else-if="currentStep === 1">
            <DeploymentModels :state="state" @add="onAdd" @remove="onRemove" />
          </div>
          <div v-else-if="currentStep === 2">
            <DeploymentWorkload :state="state" />
          </div>
          <div v-else class="space-y-4">
            <ResultsStub :state="state" />
            <Legend />
            <PerGpuBars :state="state" />
          </div>
          <div class="flex items-center justify-between pt-2">
            <button class="px-3 py-1.5 rounded bg-surface border" :disabled="currentStep === 0" @click="prev">Back</button>
            <button class="px-3 py-1.5 rounded bg-primary text-white disabled:opacity-50" :disabled="!canNext" @click="next">{{ currentStep < steps.length - 1 ? 'Next' : 'Done' }}</button>
          </div>
        </div>

        <!-- Preview column (sticky layout; visibility wired in 0.2) -->
        <div class="lg:sticky lg:top-20" v-if="shouldShowPreview(state)">
          <PreviewPanel :state="state" />
        </div>
      </div>
    </section>
    <FooterBar />
  </main>
</template>

<script setup lang="ts">
import { onMounted, watch, ref, reactive, computed } from 'vue'
import DeploymentModels from '@ui/DeploymentModels.vue'
import DeploymentWorkload from '@ui/DeploymentWorkload.vue'
import ResultsStub from '@ui/ResultsStub.vue'
import PerGpuBars from '@ui/PerGpuBars.vue'
import Legend from '@ui/Legend.vue'
import Stepper from '@ui/Stepper.vue'
import GpuSelector from '@ui/GpuSelector.vue'
import TopBar from '@ui/TopBar.vue'
import PreviewPanel from '@ui/PreviewPanel.vue'
import { shouldShowPreview } from '@app/controller'
import FooterBar from '@ui/FooterBar.vue'
import { createInitialState } from '@app/state'
import { addDeployment, removeDeployment, init, loadUnitPreference } from '@app/controller'

const dark = ref(false)
const state = reactive(createInitialState())
const steps = ['Select GPUs', 'Select Models', 'Configure Workload', 'Results']
onMounted(() => {
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) dark.value = true
  init(state)
  loadUnitPreference(state)
})
watch(dark, (v) => {
  document.documentElement.classList.toggle('dark', v)
})

function onAdd() { addDeployment(state) }
function onRemove(id: string) { removeDeployment(state, id) }

const currentStep = ref(0)
const canNext = computed(() => {
  if (currentStep.value === 0) return state.gpus.length > 0
  if (currentStep.value === 1) return state.deployments.length > 0 && state.deployments.every(d => !!d.modelId)
  if (currentStep.value === 2) return state.deployments.every(d => d.assignedGpuIds.length > 0)
  return true
})
function next() { if (canNext.value && currentStep.value < steps.length - 1) currentStep.value++ }
function prev() { if (currentStep.value > 0) currentStep.value-- }
</script>

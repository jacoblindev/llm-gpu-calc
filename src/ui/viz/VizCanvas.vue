<template>
  <section class="h-full flex flex-col">
    <VizSummary class="mb-2" @open-warnings="emit('open-warnings')" />
    <VizControls class="sticky top-0 z-10 border-b bg-white/70 dark:bg-slate-900/70 backdrop-blur" />
    <div class="flex-1 overflow-auto p-4">
      <PerGpuWaffle @inspect="emit('inspect', $event)" />
    </div>
  </section>
</template>

<script setup lang="ts">
import VizControls from './VizControls.vue'
import PerGpuWaffle from './PerGpuWaffle.vue'
import VizSummary from './VizSummary.vue'

const emit = defineEmits<{
  (e: 'inspect', payload: { gpuId: string; name: string; trigger: HTMLElement | null }): void
  (e: 'open-warnings'): void
}>()
</script>

<template>
  <section class="h-full flex flex-col">
    <VizControls class="sticky top-0 z-10 border-b bg-white/70 dark:bg-slate-900/70 backdrop-blur" />
    <div class="flex-1 overflow-auto p-4">
      <PerGpuWaffle />
    </div>
  </section>
</template>

<script setup lang="ts">
import VizControls from './VizControls.vue'
import PerGpuWaffle from './PerGpuWaffle.vue'
</script>


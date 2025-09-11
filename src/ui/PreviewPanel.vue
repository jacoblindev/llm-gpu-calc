<template>
  <aside class="bg-surface border border-muted/30 rounded-md p-4">
    <h2 class="text-lg font-semibold">Results Preview</h2>
    <div class="mt-2">
      <!-- Compact bars reuse the same component/labels as Results -->
      <PerGpuBars :state="state" />
    </div>
  </aside>
</template>

<script setup lang="ts">
import type { AppState } from '@app/state'
import PerGpuBars from '@ui/PerGpuBars.vue'

defineProps<{ state: AppState }>()
</script>

<style scoped></style>

<template>
  <aside class="bg-surface border border-muted/30 rounded-md p-4">
    <h2 class="text-lg font-semibold">Results Preview</h2>
    <div class="mt-2 text-sm text-muted">
      Preview shows per-GPU bars once wired.
    </div>
    <!--
      Later steps (1.x/2.x/5.x) will render compact per-GPU bars here,
      reuse the same segment labeling as Results, and add keyboard/ARIA.
    -->
  </aside>
</template>

<script setup lang="ts">
import type { AppState } from '@app/state'

defineProps<{ state: AppState }>()
</script>

<style scoped></style>


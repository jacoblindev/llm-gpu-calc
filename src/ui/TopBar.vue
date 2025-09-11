<template>
  <header class="flex items-center justify-between">
    <h1 class="text-2xl font-semibold">LLM GPU vRAM Calculator</h1>
    <div class="flex items-center gap-2">
      <button
        class="px-3 py-2 rounded-md bg-surface border border-muted/30"
        @click="$emit('toggle-theme')"
      >
        Toggle {{ dark ? 'Light' : 'Dark' }}
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{ dark: boolean }>()
defineEmits<{ (e: 'toggle-theme'): void }>()
</script>

<style scoped></style>


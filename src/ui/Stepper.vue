<template>
  <ol class="flex gap-2 text-sm">
    <li v-for="(s, i) in steps" :key="i" class="flex items-center gap-2">
      <span :class="['w-6 h-6 rounded-full flex items-center justify-center', i === current ? 'bg-primary text-white' : 'bg-surface border border-muted/30']">{{ i+1 }}</span>
      <span :class="[i === current ? 'font-medium' : 'text-muted']">{{ s }}</span>
      <span v-if="i < steps.length - 1" class="mx-2 text-muted">›</span>
    </li>
  </ol>
</template>

<script setup lang="ts">
defineProps<{ steps: string[]; current: number }>()
</script>

<style scoped></style>


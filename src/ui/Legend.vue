<template>
  <div class="flex flex-wrap gap-3 text-sm">
    <div v-for="item in items" :key="item.key" class="flex items-center gap-2">
      <span class="inline-block w-3 h-3 rounded" :style="{ backgroundColor: item.color }" />
      <span class="text-muted">{{ item.label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
const items = [
  { key: 'weights', label: 'Weights', color: 'var(--color-weights)' },
  { key: 'kv', label: 'KV Cache', color: 'var(--color-kv)' },
  { key: 'reserve', label: 'Implied Reserve', color: 'var(--color-reserve)' },
  { key: 'free', label: 'Free', color: 'var(--color-free)' },
]
</script>

<style scoped></style>


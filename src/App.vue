<template>
  <main class="min-h-dvh bg-bg text-text p-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">LLM GPU vRAM Calculator</h1>
      <button
        class="px-3 py-2 rounded-md bg-surface border border-muted/30"
        @click="dark = !dark"
      >
        Toggle {{ dark ? 'Light' : 'Dark' }}
      </button>
    </div>
    <section class="mt-4">
      <Sample />
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, watch, ref } from 'vue'
import Sample from '@ui/Sample.vue'

const dark = ref(false)
onMounted(() => {
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) dark.value = true
})
watch(dark, (v) => {
  document.documentElement.classList.toggle('dark', v)
})
</script>


<template>
  <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(260px, 1fr))">
    <!-- Stub tiles: real mapping and data binding arrive in later tasks -->
    <div class="border rounded-md p-3 text-xs text-slate-600 dark:text-slate-300" v-for="n in 3" :key="n">
      <div class="font-medium mb-2">GPU #{{ n }} — Waffle (stub)</div>
      <div class="grid grid-cols-10 gap-[1px]">
        <div v-for="i in 100" :key="i" class="w-3 h-3 bg-slate-200 dark:bg-slate-700"></div>
      </div>
      <div class="mt-2 text-[11px] text-slate-500">Used 0% • Reserve 0% • Free 100%</div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Public API target (per PRD):
// props could accept precomputed tiles; for now keep as stub
// defineProps<{ tiles?: Array<unknown> }>()
</script>


<template>
  <div class="bg-surface border border-muted/30 rounded-md p-4 flex flex-wrap gap-4 items-end">
    <div>
      <label class="block text-sm text-muted">Units</label>
      <select class="mt-1 px-2 py-1 bg-bg border border-muted/30 rounded" :value="state.unit" @change="onUnitChange($event)">
        <option value="GiB">GiB</option>
        <option value="GB">GB</option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AppState } from '@app/state'
import { setUnit } from '@app/controller'

const props = defineProps<{ state: AppState }>()

function onUnitChange(e: Event) {
  const v = (e.target as HTMLSelectElement).value as 'GiB'|'GB'
  setUnit(props.state, v)
}
</script>

<style scoped>
</style>

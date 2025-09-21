<template>
  <div class="viz-waffle-grid">
    <article v-for="tile in tiles" :key="tile.gpuId" class="tile">
      <header class="tile__header">
        <div class="tile__title">
          <span class="tile__name">{{ tile.gpuName }}</span>
          <span class="tile__capacity">{{ tile.capacityLabel }}</span>
        </div>
        <span class="tile__status" :class="tile.statusClass" :title="tile.statusTitle">
          {{ tile.statusText }}
        </span>
      </header>

      <div
        class="tile__grid"
        role="img"
        :aria-label="tile.ariaLabel"
        :style="{ gridTemplateColumns: `repeat(${tile.gridSize}, minmax(0, 1fr))` }"
      >
        <div
          v-for="(cell, idx) in tile.cells"
          :key="idx"
          class="tile__cell"
          :style="cellStyle(cell, tile.cellSize)"
          aria-hidden="true"
        />
      </div>

      <footer class="tile__footer">
        Used {{ tile.usedPercent }}% • Reserve {{ tile.reservePercent }}% • Free {{ tile.freePercent }}%
      </footer>
    </article>

    <p v-if="tiles.length === 0" class="tile__empty">Select GPUs to populate the waffle visualization.</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '@app/store'
import { gpuCapacityLabel, type WaffleCategory } from '@app/controller'
import type { Gpu } from '@shared/types'

const store = useAppStore()
const { waffleCells, fitStatus } = storeToRefs(store)

type TileStatus = {
  text: 'Over' | 'Warning' | 'OK'
  class: string
  title: string
}

function resolveStatus(gpuId: string): TileStatus {
  const status = fitStatus.value.find((s) => s.gpuId === gpuId)
  if (!status) {
    return { text: 'OK', class: 'is-ok', title: 'No status available' }
  }
  const reason = status.reason ?? ''
  if (!status.ok) {
    return { text: 'Over', class: 'is-over', title: reason || 'Over capacity or no headroom' }
  }
  if (reason.includes('High utilization')) {
    return { text: 'Warning', class: 'is-warn', title: reason }
  }
  return { text: 'OK', class: 'is-ok', title: reason || 'Within capacity' }
}

const order: WaffleCategory[] = ['weights', 'kv', 'reserve', 'free']

function expandCells(counts: Record<WaffleCategory, number>, total: number): WaffleCategory[] {
  const slots: WaffleCategory[] = []
  for (const kind of order) {
    const n = counts[kind] || 0
    for (let i = 0; i < n; i++) slots.push(kind)
  }
  if (slots.length > total) return slots.slice(0, total)
  while (slots.length < total) slots.push('free')
  return slots
}

function percentOf(value: number, capacity: number): string {
  if (!capacity) return '0'
  const pct = (value / capacity) * 100
  return pct >= 99.5 ? '100' : pct <= 0.5 ? '0' : pct.toFixed(0)
}

const tiles = computed(() => {
  return (waffleCells.value ?? []).map((entry) => {
    const status = resolveStatus(entry.gpuId)
    const totalCells = entry.totalCells || entry.gridSize ** 2
    const cells = expandCells(entry.cells, totalCells)
    const usedBytes = entry.weightsBytes + entry.kvBytes
    const capacity = entry.capacityBytes || 1
    const usedPercent = percentOf(usedBytes, capacity)
    const reservePercent = percentOf(entry.reserveBytes, capacity)
    const freePercent = percentOf(entry.freeBytes, capacity)
    const densityLabel = entry.gridSize === 20 ? '20×20 compact grid' : '10×10 default grid'
    const ariaLabel = `${entry.gpuName} waffle (${densityLabel}). Used ${usedPercent} percent (weights ${percentOf(entry.weightsBytes, capacity)}%, KV ${percentOf(entry.kvBytes, capacity)}%), reserve ${reservePercent} percent, free ${freePercent} percent.`
    const cellSize = entry.gridSize >= 20 ? '0.55rem' : '0.7rem'
    const gpuMeta: Gpu = { id: entry.gpuId, name: entry.gpuName, vramBytes: entry.capacityBytes }

    return {
      gpuId: entry.gpuId,
      gpuName: entry.gpuName,
      capacityLabel: gpuCapacityLabel(gpuMeta),
      statusText: status.text,
      statusClass: status.class,
      statusTitle: status.title,
      gridSize: entry.gridSize,
      cells,
      usedPercent,
      reservePercent,
      freePercent,
      ariaLabel,
      cellSize,
    }
  })
})

function cellStyle(kind: WaffleCategory, size: string) {
  const color =
    kind === 'weights'
      ? 'var(--color-weights)'
      : kind === 'kv'
      ? 'var(--color-kv)'
      : kind === 'reserve'
      ? 'var(--color-reserve)'
      : 'var(--color-unallocated)'
  return {
    width: size,
    height: size,
    backgroundColor: color,
  }
}
</script>

<style scoped>
.viz-waffle-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
}

.tile {
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: var(--radius-md);
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: var(--color-surface, #f5f5f7);
  color: var(--color-text, #1d1d1f);
}

.tile__header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 0.5rem;
}

.tile__title {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.tile__name {
  font-weight: 600;
  font-size: 0.95rem;
}

.tile__capacity {
  font-size: 0.75rem;
  color: var(--color-muted, #6e6e73);
}

.tile__status {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  line-height: 1.2;
  white-space: nowrap;
}

.tile__status.is-ok {
  background: rgba(48, 209, 88, 0.12);
  color: var(--color-success, #34c759);
}

.tile__status.is-warn {
  background: rgba(255, 159, 10, 0.12);
  color: var(--color-warning, #ff9f0a);
}

.tile__status.is-over {
  background: rgba(255, 59, 48, 0.15);
  color: var(--color-danger, #ff3b30);
}

.tile__grid {
  display: grid;
  gap: 1px;
  align-self: stretch;
}

.tile__cell {
  border-radius: 1px;
}

.tile__footer {
  margin-top: auto;
  font-size: 0.7rem;
  color: var(--color-muted, #6e6e73);
}

.tile__empty {
  grid-column: 1 / -1;
  padding: 1.5rem;
  border: 1px dashed rgba(148, 163, 184, 0.4);
  border-radius: var(--radius-md);
  text-align: center;
  font-size: 0.85rem;
  color: var(--color-muted, #6e6e73);
}

@media (max-width: 640px) {
  .viz-waffle-grid {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }
}
</style>

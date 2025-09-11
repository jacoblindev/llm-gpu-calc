<template>
  <div class="space-y-3">
    <div v-for="b in bars" :key="b.gpuId" class="border border-muted/30 rounded p-3 bg-surface">
      <div class="flex items-center justify-between mb-2">
        <div class="font-medium">{{ b.gpuName }}</div>
        <div class="text-sm text-muted">Capacity: {{ format(b.capacityBytes) }}</div>
      </div>
      <div class="w-full h-6 md:h-5 rounded bg-bg overflow-hidden border border-muted/30 relative">
        <div
          v-for="(s, idx) in b.segments"
          :key="idx"
          class="h-full w-full absolute flex items-center seg"
          :style="segmentStyle(b.capacityBytes, s, idx, b.segments)"
          :aria-label="segmentTitle(b.capacityBytes, s)"
          role="img"
          data-segment
          tabindex="0"
          @focus="onFocus(b.capacityBytes, s, $event)"
          @blur="onLeave"
          @mouseenter="onEnter(b.capacityBytes, s, $event)"
          @mousemove="onMove($event)"
          @mouseleave="onLeave"
          @keydown="onKeyNav"
        >
          <span
            v-if="shouldShowInlineLabel(b.capacityBytes, s.bytes)"
            aria-hidden="true"
            class="ml-1 px-1 py-[1px] rounded text-[10px] sm:text-[11px] font-medium text-white shadow whitespace-nowrap"
            :style="labelStyle(b.capacityBytes, s)"
          >{{ segmentLabel(b.capacityBytes, s) }}</span>
        </div>
      </div>
    </div>
  </div>
  <div v-if="tip.visible" class="fixed z-50 pointer-events-none px-2 py-1 text-xs rounded bg-surface text-text border border-muted/30 shadow" :style="{ left: tip.x + 'px', top: tip.y + 'px' }">
    {{ tip.text }}
  </div>
</template>

<script setup lang="ts">
import type { AppState } from '@app/state'
import { buildPerGpuBars, type PerGpuBar } from '@app/controller'
import { computed, reactive } from 'vue'
import { formatBytes } from '@shared/units'
import { buildSegmentAriaLabel, nextIndexForArrow, shouldShowInlineLabel, segmentPercent } from '@shared/preview'

const props = defineProps<{ state?: AppState; bars?: PerGpuBar[] }>()

const bars = computed(() => props.bars ?? (props.state ? buildPerGpuBars(props.state) : []))

function colorFor(kind: 'weights'|'kv'|'reserve'|'free') {
  switch (kind) {
    case 'weights': return 'var(--color-weights)'
    case 'kv': return 'var(--color-kv)'
    case 'reserve': return 'var(--color-reserve)'
    case 'free': return 'var(--color-free)'
  }
}

function segmentStyle(capacity: number, s: { bytes: number; kind: 'weights'|'kv'|'reserve'|'free' }, idx: number, all: { bytes: number; kind: any }[]) {
  const total = capacity || 1
  const start = all.slice(0, idx).reduce((a, c) => a + c.bytes, 0)
  const leftPct = (start / total) * 100
  const widthPct = (s.bytes / total) * 100
  return {
    transform: `translateX(${leftPct}%) scaleX(${widthPct / 100})`,
    backgroundColor: colorFor(s.kind),
    willChange: 'transform',
  }
}

function segmentTitle(capacity: number, s: { kind: 'weights'|'kv'|'reserve'|'free'; bytes: number; modelName?: string }) {
  return buildSegmentAriaLabel(capacity, s.bytes, s.kind, s.modelName, (b) => format(b))
}

function segmentLabel(capacity: number, s: { kind: 'weights'|'kv'|'reserve'|'free'; bytes: number }) {
  const pct = Math.round((s.bytes / (capacity || 1)) * 100)
  return `${format(s.bytes)} (${pct}%)`
}

function labelStyle(capacity: number, s: { bytes: number }) {
  const pct = segmentPercent(capacity, s.bytes)
  const scale = pct > 0 ? 100 / pct : 1
  return {
    transform: `scaleX(${scale})`,
    transformOrigin: 'left center',
    willChange: 'transform',
    pointerEvents: 'none',
  } as const
}

function format(b: number) { return formatBytes(b, (props.state?.unit ?? 'GiB') as any, 1) }

// Instant tooltip (faster than native title)
const tip = reactive({ visible: false, text: '', x: 0, y: 0 })
function onEnter(capacity: number, s: { kind: 'weights'|'kv'|'reserve'|'free'; bytes: number; modelName?: string }, e: MouseEvent) {
  tip.visible = true
  tip.text = segmentTitle(capacity, s)
  onMove(e)
}
function onMove(e: MouseEvent) {
  tip.x = e.clientX + 12
  tip.y = e.clientY + 12
}
function onLeave() { tip.visible = false }

// Keyboard focus support
function onFocus(capacity: number, s: { kind: 'weights'|'kv'|'reserve'|'free'; bytes: number; modelName?: string }, e: FocusEvent) {
  tip.visible = true
  tip.text = segmentTitle(capacity, s)
  const el = e.target as HTMLElement
  const rect = el.getBoundingClientRect()
  tip.x = rect.left + rect.width / 2
  tip.y = rect.top - 8
}

function onKeyNav(e: KeyboardEvent) {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
  const current = e.currentTarget as HTMLElement | null
  if (!current) return
  const parent = current.parentElement
  if (!parent) return
  const segments = Array.from(parent.querySelectorAll('[data-segment]')) as HTMLElement[]
  const idx = segments.indexOf(current!)
  const nextIdx = nextIndexForArrow(segments.length, idx, e.key)
  const next = segments[nextIdx]
  if (next) {
    next.focus()
    e.preventDefault()
  }
}
</script>

<style scoped>
.seg {
  transform-origin: left center;
  transition: transform 150ms ease-in-out, opacity 150ms ease-in-out;
}
</style>

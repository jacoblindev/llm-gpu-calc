<template>
  <div class="min-h-screen flex flex-col">
    <CommandStrip class="border-b" />
    <main class="flex-1 relative">
      <VizCanvas class="h-full" />
      <!-- Overlays (closed by default in stub) -->
      <ControlDock class="hidden" />
      <InsightsDrawer class="hidden" />
      <TileInspector class="hidden" />
    </main>
    <FooterBar />
  </div>
  
</template>

<script setup lang="ts">
import CommandStrip from './CommandStrip.vue'
import VizCanvas from '../viz/VizCanvas.vue'
import ControlDock from '../dock/ControlDock.vue'
import InsightsDrawer from '../dock/InsightsDrawer.vue'
import TileInspector from '../inspector/TileInspector.vue'
import FooterBar from '../FooterBar.vue'
</script>


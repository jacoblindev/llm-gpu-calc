<template>
  <footer class="footer">
    <div class="inner">
      <div class="muted">v{{ version }}</div>
      <nav class="links">
        <a :href="repoUrl" target="_blank" rel="noopener noreferrer">GitHub</a>
        <span aria-hidden="true">·</span>
        <a :href="adrUrl" target="_blank" rel="noopener noreferrer">ADRs</a>
      </nav>
    </div>
  </footer>
  
</template>

<script setup lang="ts">
// Vite supports importing JSON; TypeScript resolves via resolveJsonModule
// Only read the version field to avoid bundling extra metadata.
import pkg from '../../package.json'

const version = (pkg as any).version as string
const repoUrl = 'https://github.com/jacoblindev/llm-gpu-calc'
const adrUrl = 'https://github.com/jacoblindev/llm-gpu-calc/tree/main/docs/adr'
</script>

<style scoped>
.footer {
  margin-top: 1.5rem;
  border-top: 1px solid var(--border-color);
  background: color-mix(in srgb, var(--color-surface) 80%, transparent);
}
.inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 0; /* 12px */
}
.muted { color: var(--color-muted); font-size: 0.875rem; }
.links { display: flex; align-items: center; gap: 0.5rem; }
.links a { color: var(--color-text); text-decoration: none; opacity: 0.8; transition: opacity 150ms ease; }
.links a:hover { opacity: 1; text-decoration: underline; }
</style>


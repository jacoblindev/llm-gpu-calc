import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwind from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// Derive base for GitHub Pages project pages, allow override via VITE_BASE
const repo = process.env.GITHUB_REPOSITORY?.split('/')?.[1]
const inferredBase = repo ? `/${repo}/` : '/'
const base = process.env.VITE_BASE ?? (process.env.GITHUB_ACTIONS ? inferredBase : '/')

export default defineConfig({
  base,
  plugins: [vue(), tailwind()],
  resolve: {
    alias: {
      '@ui': fileURLToPath(new URL('./src/ui', import.meta.url)),
      '@app': fileURLToPath(new URL('./src/app', import.meta.url)),
      '@domain': fileURLToPath(new URL('./src/domain', import.meta.url)),
      '@data': fileURLToPath(new URL('./src/data', import.meta.url)),
      '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
    },
  },
})

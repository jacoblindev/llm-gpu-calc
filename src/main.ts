import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { DashboardShell } from '@ui'
import { isV3ShellEnabled } from './flags'
import { useAppStore } from '@app'
import './styles/index.css'

const Root = isV3ShellEnabled() ? DashboardShell : App
const pinia = createPinia()
const app = createApp(Root)
app.use(pinia)

// Initialize store when v3 shell is enabled (no UI code touches URL/LS directly)
if (isV3ShellEnabled()) {
  const store = useAppStore()
  store.init()
  store.loadUnitPreference()
  store.startViewPrefsSync()
}

app.mount('#app-root')

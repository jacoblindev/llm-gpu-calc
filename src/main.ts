import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { DashboardShell } from '@ui'
import { isV3ShellEnabled } from './flags'
import './styles/index.css'

const Root = isV3ShellEnabled() ? DashboardShell : App
const app = createApp(Root)
app.use(createPinia())
app.mount('#app-root')

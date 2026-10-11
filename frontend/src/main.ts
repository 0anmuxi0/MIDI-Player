import { createApp } from 'vue'
import App from './App.vue'
import './winui/styles/theme.css'
import './winui/styles/animations.css'
import './app.css'
import { createI18n, i18nKey } from './winui/components/i18n/index'

const i18n = createI18n(navigator.language)
document.documentElement.lang = i18n.locale

const app = createApp(App)
app.provide(i18nKey, i18n)
app.config.globalProperties.$t = i18n.t
app.mount('#app')

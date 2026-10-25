import '@fontsource/press-start-2p/latin-400.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { installHistory } from './lib/history'
import { applyTheme, loadSettings } from './lib/settings'
import './styles.css'
import './design/tokens.css'
import './design/app.css'
import './design/animations.css'
import './design/shell.css'

applyTheme(loadSettings().theme)

installHistory()

registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return
    const check = () => {
      if (document.visibilityState === 'visible') void registration.update()
    }
    document.addEventListener('visibilitychange', check)
  },
})

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault()
  window.__bip = event as Window['__bip']
  window.dispatchEvent(new Event('bip-ready'))
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

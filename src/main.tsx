import '@fontsource/rubik/latin-400.css'
import '@fontsource/rubik/latin-600.css'
import '@fontsource/rubik/latin-700.css'
import '@fontsource/rubik/latin-ext-400.css'
import '@fontsource/rubik/latin-ext-600.css'
import '@fontsource/rubik/latin-ext-700.css'
import '@fontsource/press-start-2p/latin-400.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './styles.css'

registerSW({ immediate: true })

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

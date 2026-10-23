import { useEffect, useState } from 'react'
import { useApp } from '../state/context'

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
}

export function InstallHint({ compact = false }: { compact?: boolean }) {
  const { settings, updateSettings } = useApp()
  const [bip, setBip] = useState<Window['__bip']>(window.__bip)
  const ios = isIos()
  const standalone = isStandalone()

  useEffect(() => {
    const onReady = () => setBip(window.__bip)
    window.addEventListener('bip-ready', onReady)
    return () => window.removeEventListener('bip-ready', onReady)
  }, [])

  if (standalone) return compact ? <p className="hint">The app is installed.</p> : null
  if (!compact && settings.installDismissed && !ios) return null

  return (
    <aside className="install">
      {ios ? (
        <p>Tap Share and then <strong>Add to Home Screen</strong>.</p>
      ) : bip ? (
        <p>Put Soul-Link on your home screen.</p>
      ) : (
        <p>In the browser menu, choose Install app or Add to Home Screen.</p>
      )}
      <div className="install-actions">
        {bip && (
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => {
              void bip.prompt()
              void bip.userChoice.finally(() => {
                window.__bip = undefined
                setBip(undefined)
              })
            }}
          >
            Install
          </button>
        )}
        {!compact && (
          <button className="btn btn-ghost" type="button" onClick={() => updateSettings({ installDismissed: true })}>
            Later
          </button>
        )}
      </div>
    </aside>
  )
}

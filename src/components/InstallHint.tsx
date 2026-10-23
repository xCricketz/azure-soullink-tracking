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

  if (standalone) return compact ? <p className="hint">Die App ist installiert.</p> : null
  if (!compact && settings.installDismissed && !ios) return null

  return (
    <aside className="install">
      {ios ? (
        <p>Tippe auf Teilen ⎋ und dann <strong>Zum Home-Bildschirm</strong>.</p>
      ) : bip ? (
        <p>Soul-Link als App auf den Startbildschirm legen.</p>
      ) : (
        <p>Im Browser-Menü „App installieren“ oder „Zum Home-Bildschirm“ wählen.</p>
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
            App installieren
          </button>
        )}
        {!compact && (
          <button className="btn btn-ghost" type="button" onClick={() => updateSettings({ installDismissed: true })}>
            Später
          </button>
        )}
      </div>
    </aside>
  )
}

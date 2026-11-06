import { useEffect, useRef, useState } from 'react'
import { readVantaEnv, vantaFallbackReason } from '../lib/vanta-fallback'

/** Sunrise Meadow sky. Soft, slow, and light enough to sit behind white cards. */
const WAVES = {
  mouseControls: false,
  touchControls: false,
  gyroControls: false,
  minHeight: 200,
  minWidth: 200,
  scale: 1,
  scaleMobile: 0.65,
  color: 0xc9f1ff,
  shininess: 16,
  waveHeight: 9,
  waveSpeed: 0.65,
  zoom: 0.9,
}

type Effect = {
  destroy: () => void
  animationLoop: () => void
  req?: number
  prevNow?: number
}

export function LoginBackdrop() {
  const host = useRef<HTMLDivElement>(null)
  const [live, setLive] = useState(false)

  useEffect(() => {
    const reason = vantaFallbackReason(readVantaEnv())
    if (reason || !host.current) return
    let effect: Effect | null = null
    let gone = false

    function pause() {
      if (!effect?.req) return
      window.cancelAnimationFrame(effect.req)
      effect.req = undefined
    }
    function resume() {
      if (!effect || document.hidden || effect.req) return
      effect.prevNow = performance.now()
      effect.animationLoop()
    }
    function onHide() {
      if (document.hidden) pause()
      else resume()
    }

    void (async () => {
      try {
        const THREE = await import('three')
        const mod = await import('vanta/dist/vanta.waves.min')
        if (gone || !host.current) return
        effect = mod.default({ el: host.current, THREE, ...WAVES })
        setLive(true)
        document.addEventListener('visibilitychange', onHide)
        if (document.hidden) pause()
      } catch {
        setLive(false)
        effect?.destroy()
        effect = null
      }
    })()

    return () => {
      gone = true
      document.removeEventListener('visibilitychange', onHide)
      effect?.destroy()
      effect = null
    }
  }, [])

  return (
    <div ref={host} className={live ? 'bgt sunrise is-waves' : 'bgt sunrise'} data-vanta={live ? 'waves' : 'css'} aria-hidden="true">
      <i className="sun" />
      <i className="cloud c1" />
      <i className="cloud c2" />
    </div>
  )
}

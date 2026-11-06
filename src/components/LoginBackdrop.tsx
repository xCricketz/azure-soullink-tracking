import { useEffect, useRef, useState } from 'react'
import { logWaves, readVantaEnv, vantaFallbackReason, vantaScale, wavesTooSlow } from '../lib/vanta-fallback'

/**
 * Saturated sky blue from the Fisi token, on a transparent canvas.
 * The violet/rose gradient behind it is CSS. The mesh has to be this
 * blue or the motion disappears into a white page.
 */
const WAVES = {
  mouseControls: false,
  touchControls: false,
  gyroControls: false,
  minHeight: 200,
  minWidth: 200,
  scale: 1,
  scaleMobile: 0.65,
  color: 0x1e9bff,
  shininess: 70,
  waveHeight: 28,
  waveSpeed: 1.35,
  zoom: 0.68,
  backgroundAlpha: 0,
}

type Effect = {
  destroy: () => void
  animationLoop: () => void
  resize?: () => void
  req?: number
  prevNow?: number
  renderer?: { setPixelRatio: (n: number) => void }
}

/** One Waves layer. Mount it once at the login root and once at the signed-in app root. */
export function AppWaves({ onLive }: { onLive?: (live: boolean) => void }) {
  const host = useRef<HTMLDivElement>(null)
  const [live, setLive] = useState(false)
  const onLiveRef = useRef(onLive)
  onLiveRef.current = onLive

  useEffect(() => {
    onLiveRef.current?.(live)
  }, [live])

  useEffect(() => {
    const reason = vantaFallbackReason(readVantaEnv())
    if (reason) {
      logWaves(`fallback ${reason}`)
      return
    }
    if (!host.current) return
    let effect: Effect | null = null
    let gone = false
    let sampleId = 0
    let startId = 0

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
    function capPixels() {
      const dpr = window.devicePixelRatio || 1
      const narrow = window.innerWidth < 600
      const ratio = Math.min(dpr, 1.5)
      effect?.renderer?.setPixelRatio(ratio)
      if (narrow && effect?.renderer) effect.renderer.setPixelRatio(Math.min(dpr / vantaScale(dpr, true), 1.5))
    }

    startId = window.requestAnimationFrame(() => {
      void (async () => {
        try {
          const THREE = await import('three')
          const mod = await import('vanta/dist/vanta.waves.min')
          if (gone || !host.current) return
          const narrow = window.innerWidth < 600
          const dpr = window.devicePixelRatio || 1
          const scale = vantaScale(dpr, narrow)
          effect = mod.default({
            el: host.current,
            THREE,
            ...WAVES,
            scale: narrow ? WAVES.scale : scale,
            scaleMobile: narrow ? scale : WAVES.scaleMobile,
          })
          capPixels()
          logWaves('started')
          setLive(true)
          document.addEventListener('visibilitychange', onHide)
          if (document.hidden) pause()
          let frames = 0
          let sampleStart = performance.now()
          const sample = (now: number) => {
            if (gone || !effect) return
            if (document.hidden) {
              frames = 0
              sampleStart = now
              sampleId = window.requestAnimationFrame(sample)
              return
            }
            frames += 1
            const elapsed = now - sampleStart
            if (elapsed >= 3000) {
              if (wavesTooSlow(frames, elapsed)) {
                logWaves('fallback slow-fps')
                effect.destroy()
                effect = null
                setLive(false)
                document.removeEventListener('visibilitychange', onHide)
              }
              return
            }
            sampleId = window.requestAnimationFrame(sample)
          }
          sampleId = window.requestAnimationFrame(sample)
        } catch {
          logWaves('fallback init-failed')
          setLive(false)
          effect?.destroy()
          effect = null
        }
      })()
    })

    return () => {
      gone = true
      window.cancelAnimationFrame(startId)
      window.cancelAnimationFrame(sampleId)
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

export const LoginBackdrop = AppWaves

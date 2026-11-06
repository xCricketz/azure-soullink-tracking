export type VantaSkip = 'reduced-motion' | 'no-webgl'

/**
 * Static gradient only when the person asked for less motion, WebGL is missing,
 * or Waves fail to start. Core count and device memory do not skip the effect.
 */
export function vantaFallbackReason(env: {
  reducedMotion: boolean
  webgl: boolean
  cores: number | null
  memoryGb: number | null
}): VantaSkip | null {
  if (env.reducedMotion) return 'reduced-motion'
  if (!env.webgl) return 'no-webgl'
  return null
}

/** True when a visible sample of about three seconds stayed under 15 fps. */
export function wavesTooSlow(frames: number, elapsedMs: number): boolean {
  if (elapsedMs < 2500 || frames < 0) return false
  return (frames * 1000) / elapsedMs < 15
}

/**
 * Vanta sets the WebGL pixel ratio to devicePixelRatio / scale.
 * Keep that ratio at or under 1.5. `narrow` is the phone width Vanta treats as mobile.
 */
export function vantaScale(dpr: number, narrow: boolean): number {
  const base = narrow ? 0.65 : 1
  const ratio = dpr > 0 ? dpr : 1
  return Math.max(base, ratio / 1.5)
}

export function readVantaEnv(): {
  reducedMotion: boolean
  webgl: boolean
  cores: number | null
  memoryGb: number | null
} {
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  let webgl = false
  try {
    const canvas = document.createElement('canvas')
    webgl = Boolean(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
  } catch {
    webgl = false
  }
  const cores = typeof navigator.hardwareConcurrency === 'number' ? navigator.hardwareConcurrency : null
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  return { reducedMotion, webgl, cores, memoryGb: typeof memory === 'number' ? memory : null }
}

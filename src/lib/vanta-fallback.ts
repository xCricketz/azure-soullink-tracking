export type VantaSkip = 'reduced-motion' | 'no-webgl' | 'low-end'

/** Static gradient when motion, WebGL, or the device budget says so. Null means Waves may start. */
export function vantaFallbackReason(env: {
  reducedMotion: boolean
  webgl: boolean
  cores: number | null
  memoryGb: number | null
}): VantaSkip | null {
  if (env.reducedMotion) return 'reduced-motion'
  if (!env.webgl) return 'no-webgl'
  if ((env.cores != null && env.cores <= 4) || (env.memoryGb != null && env.memoryGb <= 2)) return 'low-end'
  return null
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

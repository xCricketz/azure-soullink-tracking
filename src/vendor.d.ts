declare module 'three' {
  export const WebGLRenderer: unknown
  const THREE: Record<string, unknown>
  export default THREE
}

declare module 'vanta/dist/vanta.waves.min' {
  export interface VantaWaves {
    destroy: () => void
    setOptions: (options: Record<string, unknown>) => void
    animationLoop: () => void
    req?: number
    prevNow?: number
  }
  export default function waves(options: Record<string, unknown>): VantaWaves
}

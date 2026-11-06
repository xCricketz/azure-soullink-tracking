import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import type { RefObject } from 'react'

/** Fade the first dozen cards. Transform and opacity only, and only when motion is allowed. */
export function useListEntrance(scope: RefObject<HTMLElement | null>, refresh: string) {
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const root = scope.current
      if (!root) return
      const nodes = gsap.utils.toArray<HTMLElement>('[data-enter]', root).slice(0, 12)
      if (!nodes.length) return
      gsap.from(nodes, {
        y: 14,
        autoAlpha: 0,
        duration: 0.42,
        stagger: 0.04,
        ease: 'power2.out',
        clearProps: 'transform,opacity,visibility',
      })
    })
    return () => mm.revert()
  }, { scope, dependencies: [refresh], revertOnUpdate: true })
}

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useRef } from 'react'

/** Tween a number. The final value is in the DOM immediately so the layout does not jump. */
export function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLElement>(null)
  useGSAP(() => {
    const node = ref.current
    if (!node) return
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const state = { n: 0 }
      node.textContent = '0'
      gsap.to(state, {
        n: value,
        duration: 0.7,
        ease: 'power1.out',
        onUpdate: () => {
          node.textContent = String(Math.round(state.n))
        },
      })
    })
    return () => mm.revert()
  }, { dependencies: [value] })
  return <b ref={ref}>{value}</b>
}

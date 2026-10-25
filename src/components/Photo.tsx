import { useState } from 'react'
import type { PlayerId } from '../lib/types'

const SIZES = { xs: 256, sm: 256, md: 256, lg: 256, xl: 512 } as const

export function Photo({
  id,
  size = 'md',
  alt = '',
}: {
  id: PlayerId
  size?: keyof typeof SIZES
  alt?: string
}) {
  const px = SIZES[size]
  const file = `${import.meta.env.BASE_URL}trainers/${id}-avatar-${px}`
  const [broken, setBroken] = useState(false)
  return (
    <span className={`ph ${id} ${size}`}>
      {broken ? (
        <span className="ph-letter" aria-hidden="true">{id === 'fisi' ? 'F' : 'S'}</span>
      ) : (
        <picture>
          <source srcSet={`${file}.webp`} type="image/webp" />
          <img src={`${file}.png`} width={px} height={px} alt={alt} decoding="async" draggable={false} onError={() => setBroken(true)} />
        </picture>
      )}
    </span>
  )
}

/** Full-body cut-out. Start cards only. */
export function Cutout({ id }: { id: PlayerId }) {
  const file = `${import.meta.env.BASE_URL}trainers/${id}-full-512`
  return (
    <picture>
      <source srcSet={`${file}.webp`} type="image/webp" />
      <img className="fig" src={`${file}.png`} alt="" width={341} height={512} decoding="async" draggable={false} />
    </picture>
  )
}

import type { PlayerId } from '../lib/types'

export function TrainerShot({
  id,
  crop,
  className,
  alt = '',
}: {
  id: PlayerId
  crop: 'full' | 'avatar'
  className?: string
  alt?: string
}) {
  const file = `${import.meta.env.BASE_URL}trainers/${id}-${crop}`
  return (
    <picture className={['trainer', className].filter(Boolean).join(' ')}>
      <source srcSet={`${file}.webp`} type="image/webp" />
      <img src={`${file}.png`} alt={alt} draggable={false} />
    </picture>
  )
}

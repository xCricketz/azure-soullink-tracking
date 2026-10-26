import { DIFFICULTY_CHOICES, difficultyLabel } from '../lib/options'
import type { Difficulty } from '../lib/types'

export function DifficultyPicker({
  value,
  onChange,
  label = 'Difficulty',
}: {
  value: Difficulty
  onChange: (difficulty: Difficulty) => void
  label?: string
}) {
  return (
    <div className="seg diff" role="group" aria-label={label}>
      {DIFFICULTY_CHOICES.map((mode) => (
        <button
          key={mode}
          type="button"
          className={value === mode ? 'on' : ''}
          aria-pressed={value === mode}
          onClick={() => onChange(mode)}
        >
          {difficultyLabel(mode)}
        </button>
      ))}
    </div>
  )
}

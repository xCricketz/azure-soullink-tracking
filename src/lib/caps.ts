import table from '../data/unbound/levelcaps.json'
import type { CapMode } from './types'

export type { CapMode }

export interface CapStep {
  label: string
  level: number
}

interface CapRow {
  key: string
  label: string
  badges: number
  tarmigan_mansion_done: boolean
  vanilla: number
  difficult: number
}

const ROWS = table.caps as CapRow[]

/** Cap for the badge count you have now. Tarmigan Mansion only changes the 4-badge step. */
export function capFor(badges: number, mode: CapMode, mansion: boolean): CapStep {
  const count = Math.max(0, Math.min(8, badges))
  const row = count >= 5
    ? ROWS.find((item) => item.badges === count && item.tarmigan_mansion_done)
    : count === 4 && mansion
      ? ROWS.find((item) => item.key === 'post_tarmigan_mansion')
      : ROWS.find((item) => item.badges === count && !item.tarmigan_mansion_done)
  const picked = row ?? ROWS[0]
  return { label: picked.label, level: mode === 'difficult' ? picked.difficult : picked.vanilla }
}

/** One-tap suggestion: the cap for the current badges, when it is not already set. */
export function suggestedCap(badges: number, mode: CapMode, mansion: boolean, saved: number | null | undefined): CapStep | null {
  const step = capFor(badges, mode, mansion)
  if (saved === step.level) return null
  return step
}

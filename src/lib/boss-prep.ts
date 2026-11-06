import { GYMS, type GymInfo } from '../data/routes'
import { attackMultiplier, asGen4 } from '../data/typechart'

const TYPE_NAMES = [
  'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Fighting', 'Poison', 'Ground', 'Flying',
  'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy',
]

/** Types written on the boss line, such as "Mirskle (Grass/Fairy)". Unknown notes are left out. */
export function bossTypeNames(boss: string): string[] {
  const inside = boss.match(/\(([^)]*)\)/)?.[1] ?? ''
  const out: string[] = []
  for (const part of inside.split(/[/|,]/)) {
    const word = part.trim().split(/\s+/)[0] ?? ''
    const hit = TYPE_NAMES.find((type) => type.toLowerCase() === word.toLowerCase())
    if (hit && !out.includes(hit)) out.push(hit)
  }
  return out
}

/** The gym whose badge is the next one. Eight badges means there is no next gym here. */
export function nextBoss(badges: number): GymInfo | null {
  const next = Math.max(0, badges) + 1
  return GYMS.find((gym) => gym.badge === next) ?? null
}

export interface Matchup {
  advantage: boolean
  disadvantage: boolean
}

/** Our attacking types against the boss types that the chart knows. Empty when either side has no chart type. */
export function teamMatchup(monTypes: string[], bossTypes: string[]): Matchup | null {
  const attack = monTypes.map((type) => asGen4(type)).filter((type) => type != null)
  const defense = bossTypes.map((type) => asGen4(type)).filter((type) => type != null)
  if (!attack.length || !defense.length) return null
  return {
    advantage: attack.some((move) => defense.some((target) => attackMultiplier(move, target) > 1)),
    disadvantage: defense.some((move) => attack.some((target) => attackMultiplier(move, target) > 1)),
  }
}

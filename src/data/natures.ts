export type NatureStat = 'atk' | 'def' | 'spa' | 'spd' | 'spe'

export const STAT_EN: Record<NatureStat, string> = {
  atk: 'Attack',
  def: 'Defense',
  spa: 'Sp. Atk',
  spd: 'Sp. Def',
  spe: 'Speed',
}

export interface Nature {
  name: string
  up: NatureStat | null
  down: NatureStat | null
}

/** Official natures. Neutrals raise and lower nothing. */
export const NATURES: Nature[] = [
  { name: 'Hardy', up: null, down: null },
  { name: 'Lonely', up: 'atk', down: 'def' },
  { name: 'Brave', up: 'atk', down: 'spe' },
  { name: 'Adamant', up: 'atk', down: 'spa' },
  { name: 'Naughty', up: 'atk', down: 'spd' },
  { name: 'Bold', up: 'def', down: 'atk' },
  { name: 'Docile', up: null, down: null },
  { name: 'Relaxed', up: 'def', down: 'spe' },
  { name: 'Impish', up: 'def', down: 'spa' },
  { name: 'Lax', up: 'def', down: 'spd' },
  { name: 'Timid', up: 'spe', down: 'atk' },
  { name: 'Hasty', up: 'spe', down: 'def' },
  { name: 'Serious', up: null, down: null },
  { name: 'Jolly', up: 'spe', down: 'spa' },
  { name: 'Naive', up: 'spe', down: 'spd' },
  { name: 'Modest', up: 'spa', down: 'atk' },
  { name: 'Mild', up: 'spa', down: 'def' },
  { name: 'Quiet', up: 'spa', down: 'spe' },
  { name: 'Bashful', up: null, down: null },
  { name: 'Rash', up: 'spa', down: 'spd' },
  { name: 'Calm', up: 'spd', down: 'atk' },
  { name: 'Gentle', up: 'spd', down: 'def' },
  { name: 'Sassy', up: 'spd', down: 'spe' },
  { name: 'Careful', up: 'spd', down: 'spa' },
  { name: 'Quirky', up: null, down: null },
]

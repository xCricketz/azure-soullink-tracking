export type NatureStat = 'atk' | 'def' | 'spa' | 'spd' | 'spe'

export const STAT_DE: Record<NatureStat, string> = {
  atk: 'Angriff',
  def: 'Verteidigung',
  spa: 'Spezial-Angriff',
  spd: 'Spezial-Verteidigung',
  spe: 'Initiative',
}

export interface Nature {
  name: string
  up: NatureStat | null
  down: NatureStat | null
}

/** Official German natures. Neutrals raise and lower nothing. */
export const NATURES: Nature[] = [
  { name: 'Robust', up: null, down: null },
  { name: 'Solo', up: 'atk', down: 'def' },
  { name: 'Mutig', up: 'atk', down: 'spe' },
  { name: 'Hart', up: 'atk', down: 'spa' },
  { name: 'Frech', up: 'atk', down: 'spd' },
  { name: 'Kühn', up: 'def', down: 'atk' },
  { name: 'Sanft', up: null, down: null },
  { name: 'Locker', up: 'def', down: 'spe' },
  { name: 'Pfiffig', up: 'def', down: 'spa' },
  { name: 'Lasch', up: 'def', down: 'spd' },
  { name: 'Scheu', up: 'spe', down: 'atk' },
  { name: 'Hastig', up: 'spe', down: 'def' },
  { name: 'Ernst', up: null, down: null },
  { name: 'Froh', up: 'spe', down: 'spa' },
  { name: 'Naiv', up: 'spe', down: 'spd' },
  { name: 'Mäßig', up: 'spa', down: 'atk' },
  { name: 'Mild', up: 'spa', down: 'def' },
  { name: 'Ruhig', up: 'spa', down: 'spe' },
  { name: 'Zaghaft', up: null, down: null },
  { name: 'Hitzig', up: 'spa', down: 'spd' },
  { name: 'Still', up: 'spd', down: 'atk' },
  { name: 'Zart', up: 'spd', down: 'def' },
  { name: 'Forsch', up: 'spd', down: 'spe' },
  { name: 'Sacht', up: 'spd', down: 'spa' },
  { name: 'Kauzig', up: null, down: null },
]

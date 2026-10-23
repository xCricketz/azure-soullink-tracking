import { monById, typeKey } from '../lib/dex'

/** Generation IV attacking types. Fairy does not exist yet. */
export const GEN4_TYPES = [
  'normal',
  'fire',
  'water',
  'electric',
  'grass',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'dark',
  'steel',
] as const

export type Gen4Type = (typeof GEN4_TYPES)[number]

export const TYPE_DE: Record<Gen4Type, string> = {
  normal: 'Normal',
  fire: 'Feuer',
  water: 'Wasser',
  electric: 'Elektro',
  grass: 'Pflanze',
  ice: 'Eis',
  fighting: 'Kampf',
  poison: 'Gift',
  ground: 'Boden',
  flying: 'Flug',
  psychic: 'Psycho',
  bug: 'Käfer',
  rock: 'Gestein',
  ghost: 'Geist',
  dragon: 'Drache',
  dark: 'Unlicht',
  steel: 'Stahl',
}

export const TYPE_SHORT: Record<Gen4Type, string> = {
  normal: 'Nor',
  fire: 'Feu',
  water: 'Was',
  electric: 'Ele',
  grass: 'Pfl',
  ice: 'Eis',
  fighting: 'Kam',
  poison: 'Gif',
  ground: 'Bod',
  flying: 'Flu',
  psychic: 'Psy',
  bug: 'Käf',
  rock: 'Ges',
  ghost: 'Gei',
  dragon: 'Dra',
  dark: 'Unl',
  steel: 'Sta',
}

/** Attacker → defender → multiplier. Missing pairs are ×1. Gen IV, no Fairy. */
const CHART: Record<Gen4Type, Partial<Record<Gen4Type, number>>> = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2 },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0 },
  ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5 },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5 },
  dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, steel: 0.5 },
  steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5 },
}

/**
 * Species whose current-dex type gained Fairy in Gen VI.
 * Values are the Gen IV typings the chart has to use.
 */
const GEN4_OVERRIDE: Record<number, readonly string[]> = {
  35: ['Normal'],
  36: ['Normal'],
  39: ['Normal'],
  40: ['Normal'],
  122: ['Psycho'],
  173: ['Normal'],
  174: ['Normal'],
  175: ['Normal'],
  176: ['Normal', 'Flug'],
  183: ['Wasser'],
  184: ['Wasser'],
  209: ['Normal'],
  210: ['Normal'],
  280: ['Psycho'],
  281: ['Psycho'],
  282: ['Psycho'],
  298: ['Normal'],
  303: ['Stahl'],
  439: ['Psycho'],
  468: ['Normal', 'Flug'],
}

const GEN4_SET = new Set<string>(GEN4_TYPES)

export function asGen4(name: string): Gen4Type | null {
  const key = typeKey(name)
  if (!key || !GEN4_SET.has(key)) return null
  return key as Gen4Type
}

export function gen4TypeNames(id: number): string[] {
  const fixed = GEN4_OVERRIDE[id]
  const mon = monById(id)
  const names = fixed ? [...fixed] : mon ? [mon.t1, mon.t2].filter(Boolean) : []
  return names.filter((name) => name !== 'Fee')
}

export function attackMultiplier(attack: Gen4Type, defense: Gen4Type): number {
  return CHART[attack][defense] ?? 1
}

export function defenseProfile(defenses: Gen4Type[]): { type: Gen4Type; mult: number }[] {
  return GEN4_TYPES.map((attack) => ({
    type: attack,
    mult: defenses.reduce((product, defense) => product * attackMultiplier(attack, defense), 1),
  }))
}

export function formatMult(mult: number): string {
  if (mult === 0.25) return '¼'
  if (mult === 0.5) return '½'
  if (mult === 0) return '0'
  return String(mult)
}

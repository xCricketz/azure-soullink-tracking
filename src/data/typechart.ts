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

export const TYPE_NAME: Record<Gen4Type, string> = {
  normal: 'Normal',
  fire: 'Fire',
  water: 'Water',
  electric: 'Electric',
  grass: 'Grass',
  ice: 'Ice',
  fighting: 'Fighting',
  poison: 'Poison',
  ground: 'Ground',
  flying: 'Flying',
  psychic: 'Psychic',
  bug: 'Bug',
  rock: 'Rock',
  ghost: 'Ghost',
  dragon: 'Dragon',
  dark: 'Dark',
  steel: 'Steel',
}

export const TYPE_SHORT: Record<Gen4Type, string> = {
  normal: 'Nor',
  fire: 'Fir',
  water: 'Wat',
  electric: 'Ele',
  grass: 'Gra',
  ice: 'Ice',
  fighting: 'Fig',
  poison: 'Poi',
  ground: 'Gro',
  flying: 'Fly',
  psychic: 'Psy',
  bug: 'Bug',
  rock: 'Roc',
  ghost: 'Gho',
  dragon: 'Dra',
  dark: 'Dar',
  steel: 'Ste',
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
  122: ['Psychic'],
  173: ['Normal'],
  174: ['Normal'],
  175: ['Normal'],
  176: ['Normal', 'Flying'],
  183: ['Water'],
  184: ['Water'],
  209: ['Normal'],
  210: ['Normal'],
  280: ['Psychic'],
  281: ['Psychic'],
  282: ['Psychic'],
  298: ['Normal'],
  303: ['Steel'],
  439: ['Psychic'],
  468: ['Normal', 'Flying'],
}

const DE_TO_EN: Record<string, string> = {
  Normal: 'Normal',
  Feuer: 'Fire',
  Wasser: 'Water',
  Elektro: 'Electric',
  Pflanze: 'Grass',
  Eis: 'Ice',
  Kampf: 'Fighting',
  Gift: 'Poison',
  Boden: 'Ground',
  Flug: 'Flying',
  Psycho: 'Psychic',
  Käfer: 'Bug',
  Gestein: 'Rock',
  Geist: 'Ghost',
  Drache: 'Dragon',
  Unlicht: 'Dark',
  Stahl: 'Steel',
  Fee: 'Fairy',
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
  const raw = fixed ? [...fixed] : mon ? [mon.t1, mon.t2].filter(Boolean) : []
  return raw.map((name) => DE_TO_EN[name] ?? name).filter((name) => name !== 'Fairy')
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

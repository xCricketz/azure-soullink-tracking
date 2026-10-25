import raw from '../data/dex.json'
import { norm } from './text'

export interface Mon {
  id: number
  de: string
  en: string
  t1: string
  t2: string
}

export const DEX: Mon[] = (raw as [number, string, string, string, string][]).map(
  ([id, de, en, t1, t2]) => ({ id, de, en, t1, t2 }),
)

const byId = new Map(DEX.map((mon) => [mon.id, mon]))

export function monById(id?: number | null): Mon | undefined {
  if (!id) return undefined
  return byId.get(id)
}

const TO_EN: Record<string, string> = {
  Feuer: 'Fire',
  Wasser: 'Water',
  Pflanze: 'Grass',
  Elektro: 'Electric',
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

/** Current-dex types in English. Gen IV display uses gen4TypeNames. */
export function monTypes(id?: number | null): string[] {
  const mon = monById(id)
  if (!mon) return []
  const names = mon.t2 ? [mon.t1, mon.t2] : [mon.t1]
  return names.map((name) => TO_EN[name] ?? name)
}

const TYPE_KEY: Record<string, string> = {
  Normal: 'normal',
  Feuer: 'fire',
  Fire: 'fire',
  Wasser: 'water',
  Water: 'water',
  Pflanze: 'grass',
  Grass: 'grass',
  Elektro: 'electric',
  Electric: 'electric',
  Eis: 'ice',
  Ice: 'ice',
  Kampf: 'fighting',
  Fighting: 'fighting',
  Gift: 'poison',
  Poison: 'poison',
  Boden: 'ground',
  Ground: 'ground',
  Flug: 'flying',
  Flying: 'flying',
  Psycho: 'psychic',
  Psychic: 'psychic',
  Käfer: 'bug',
  Bug: 'bug',
  Gestein: 'rock',
  Rock: 'rock',
  Geist: 'ghost',
  Ghost: 'ghost',
  Drache: 'dragon',
  Dragon: 'dragon',
  Unlicht: 'dark',
  Dark: 'dark',
  Stahl: 'steel',
  Steel: 'steel',
  Fee: 'fairy',
  Fairy: 'fairy',
}

export function typeKey(name?: string | null): string | null {
  if (!name) return null
  return TYPE_KEY[name] ?? null
}

export function spriteUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
}

export function platinumSpriteUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-iv/platinum/${id}.png`
}

/** Newest art first, then Home, then the default sprite. */
export function spriteSources(id: number): string[] {
  if (id < 1) return []
  return [
    artworkUrl(id),
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${id}.png`,
    spriteUrl(id),
  ]
}

export function artworkUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`
}

export function searchMons(query: string, limit = 30, maxId = 1025): Mon[] {
  const needle = norm(query)
  if (!needle) return []
  const starts: Mon[] = []
  const contains: Mon[] = []
  for (const mon of DEX) {
    if (mon.id > maxId) break
    const de = norm(mon.de)
    const en = norm(mon.en)
    const id = String(mon.id)
    if (de.startsWith(needle) || en.startsWith(needle) || id === needle) starts.push(mon)
    else if (de.includes(needle) || en.includes(needle) || id.startsWith(needle)) contains.push(mon)
    if (starts.length >= limit) break
  }
  return [...starts, ...contains].slice(0, limit)
}

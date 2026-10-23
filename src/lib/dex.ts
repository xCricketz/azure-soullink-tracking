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

export function monTypes(id?: number | null): string[] {
  const mon = monById(id)
  if (!mon) return []
  return mon.t2 ? [mon.t1, mon.t2] : [mon.t1]
}

export function spriteUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
}

export function artworkUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`
}

export function searchMons(query: string, limit = 30): Mon[] {
  const needle = norm(query)
  if (!needle) return []
  const starts: Mon[] = []
  const contains: Mon[] = []
  for (const mon of DEX) {
    const de = norm(mon.de)
    const en = norm(mon.en)
    const id = String(mon.id)
    if (de.startsWith(needle) || en.startsWith(needle) || id === needle) starts.push(mon)
    else if (de.includes(needle) || en.includes(needle) || id.startsWith(needle)) contains.push(mon)
    if (starts.length >= limit) break
  }
  return [...starts, ...contains].slice(0, limit)
}

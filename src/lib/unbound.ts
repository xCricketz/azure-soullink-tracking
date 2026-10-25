import { useEffect, useState } from 'react'

export interface UMon {
  nat: number
  borrius: number | null
  name: string
  form: string | null
  types: string[]
  how: string
  gen8: boolean
  note?: string
  key: string
}

export interface UEvo {
  species: string
  evolves_to: string
  method: string
  category: string
  confidence: string
}

export interface EncounterRow {
  species: string
  form: string | null
  method: string
  time?: string
}

export interface EncounterArea {
  key: string
  name: string
  wild: EncounterRow[]
  special: EncounterRow[]
}

interface DexRow {
  nat: number
  borrius: number | null
  name: string
  form: string | null
  types: string[]
  how: string
  gen8: boolean
  note?: string
}

let dexPromise: Promise<UMon[]> | null = null
let evoPromise: Promise<UEvo[]> | null = null
let areaPromise: Promise<Map<string, EncounterArea>> | null = null
let dexCache: UMon[] | null = null
const dexListeners = new Set<() => void>()

export function dexKey(nat: number, form?: string | null): string {
  return form ? `${nat}|${form}` : String(nat)
}

export function parseDexKey(key: string): { nat: number; form: string | null } {
  const [nat, form] = key.split('|')
  const id = Number(nat)
  return { nat: Number.isFinite(id) ? id : 0, form: form || null }
}

export function monLabel(mon: { name: string; form?: string | null }): string {
  return mon.form ? `${mon.name} (${mon.form})` : mon.name
}

export function wikiUrl(mon: { name: string; form?: string | null }): string {
  const slug = (mon.form ? `${mon.form} ${mon.name}` : mon.name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `https://unboundwiki.com/pokemon/${slug}/`
}

function decorate(rows: DexRow[]): UMon[] {
  return rows.map((row) => ({ ...row, key: dexKey(row.nat, row.form) }))
}

export function loadDex(): Promise<UMon[]> {
  if (dexCache) return Promise.resolve(dexCache)
  if (!dexPromise) {
    dexPromise = import('../data/unbound/dex.json').then((mod) => {
      dexCache = decorate(mod.default as DexRow[])
      dexListeners.forEach((listener) => listener())
      return dexCache
    })
  }
  return dexPromise
}

export function useDex(): UMon[] | null {
  const [, bump] = useState(0)
  useEffect(() => {
    const listener = () => bump((value) => value + 1)
    dexListeners.add(listener)
    void loadDex()
    return () => { dexListeners.delete(listener) }
  }, [])
  return dexCache
}

export function findMon(list: UMon[] | null, nat?: number | null, form?: string | null): UMon | undefined {
  if (!list || !nat) return undefined
  const key = dexKey(nat, form)
  return list.find((mon) => mon.key === key) ?? list.find((mon) => mon.nat === nat && !mon.form)
}

/** Match an evolutions.json species string ("Kadabra", "Alolan Graveler"). */
export function findByEvoName(list: UMon[] | null, label: string): UMon | undefined {
  if (!list) return undefined
  return list.find((mon) => mon.name === label || monLabel(mon) === label || `${mon.form ?? ''} ${mon.name}`.trim() === label)
}

export function searchDex(list: UMon[], query: string, limit = 12, gen8 = true): UMon[] {
  const needle = query.trim().toLowerCase().replace(/^#/, '')
  if (!needle) return []
  const pool = gen8 ? list : list.filter((mon) => !mon.gen8)
  const starts: UMon[] = []
  const rest: UMon[] = []
  for (const mon of pool) {
    const label = monLabel(mon).toLowerCase()
    const nums = [String(mon.nat), mon.borrius ? String(mon.borrius) : '']
    if (label.startsWith(needle) || nums.some((num) => num === needle)) starts.push(mon)
    else if (label.includes(needle) || nums.some((num) => num.startsWith(needle)) || (mon.form ?? '').toLowerCase().includes(needle)) rest.push(mon)
    if (starts.length >= limit) break
  }
  return [...starts, ...rest].slice(0, limit)
}

export function loadEvolutions(): Promise<UEvo[]> {
  if (!evoPromise) {
    evoPromise = import('../data/unbound/evolutions.json').then((mod) => mod.default as UEvo[])
  }
  return evoPromise
}

export function evoUnconfirmed(evo: UEvo): boolean {
  return evo.confidence.startsWith('UNCONFIRMED')
}

export function evolutionsFor(list: UEvo[], mon: { name: string; form?: string | null }): UEvo[] {
  const aliases = new Set([mon.name, mon.form ? `${mon.form} ${mon.name}` : ''].filter(Boolean))
  return list.filter((evo) => aliases.has(evo.species) || aliases.has(evo.evolves_to))
}

export function loadAreas(): Promise<Map<string, EncounterArea>> {
  if (!areaPromise) {
    areaPromise = import('../data/unbound/encounters.json').then((mod) => {
      const areas = (mod.default as { areas: EncounterArea[] }).areas
      return new Map(areas.map((area) => [area.key, area]))
    })
  }
  return areaPromise
}

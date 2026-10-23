import { monById } from './dex'

export interface WikiStat {
  label: string
  value: number
}

export interface WikiAbility {
  name: string
  hidden: boolean
}

export interface EvoNode {
  id: number
  name: string
  method: string
  to: EvoNode[]
}

export interface WikiMon {
  v: 2
  id: number
  name: string
  stats: WikiStat[]
  abilities: WikiAbility[]
  chain: EvoNode
}

const DB_NAME = 'soullink-wiki'
const STORE = 'mons'
const LS_PREFIX = 'sl-wiki:'
const memory = new Map<number, WikiMon>()
const labels = new Map<string, string>()

const STAT_LABEL: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
}

interface Named {
  name: string
  url: string
}

interface EvoDetail {
  trigger: Named | null
  min_level: number | null
  item: Named | null
  held_item: Named | null
  min_happiness: number | null
  min_beauty: number | null
  time_of_day: string
  gender: number | null
  known_move: Named | null
  location: Named | null
  relative_physical_stats: number | null
  party_species: Named | null
  trade_species: Named | null
}

interface Chain {
  species: Named
  evolution_details: EvoDetail[]
  evolves_to: Chain[]
}

function valid(mon: WikiMon | null | undefined): mon is WikiMon {
  return Boolean(mon && mon.v === 2 && mon.id && mon.name && mon.chain && Array.isArray(mon.stats))
}

function lsRead(id: number): WikiMon | null {
  try {
    const raw = localStorage.getItem(LS_PREFIX + id)
    if (!raw) return null
    const parsed = JSON.parse(raw) as WikiMon
    return valid(parsed) ? parsed : null
  } catch {
    return null
  }
}

function lsWrite(mon: WikiMon): void {
  try {
    localStorage.setItem(LS_PREFIX + mon.id, JSON.stringify(mon))
  } catch {
    /* quota or private mode */
  }
}

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, 1)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' })
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

async function idbRead(id: number): Promise<WikiMon | null> {
  const db = await openDb()
  if (!db) return null
  return new Promise((resolve) => {
    try {
      const get = db.transaction(STORE, 'readonly').objectStore(STORE).get(id)
      get.onsuccess = () => resolve(valid(get.result as WikiMon | undefined) ? (get.result as WikiMon) : null)
      get.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

async function idbWrite(mon: WikiMon): Promise<void> {
  const db = await openDb()
  if (!db) return
  await new Promise<void>((resolve) => {
    try {
      const put = db.transaction(STORE, 'readwrite').objectStore(STORE).put(mon)
      put.onsuccess = () => resolve()
      put.onerror = () => resolve()
    } catch {
      resolve()
    }
  })
}

export function peekWiki(id: number): WikiMon | null {
  return memory.get(id) ?? null
}

export async function readWiki(id: number): Promise<WikiMon | null> {
  const hot = memory.get(id)
  if (hot) return hot
  const stored = (await idbRead(id)) ?? lsRead(id)
  if (stored) memory.set(id, stored)
  return stored
}

async function writeWiki(mon: WikiMon): Promise<void> {
  memory.set(mon.id, mon)
  await idbWrite(mon)
  lsWrite(mon)
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`https://pokeapi.co/api/v2/${path}`, { signal: AbortSignal.timeout(12000) })
  if (!response.ok) throw new Error(`PokeAPI ${response.status}`)
  return response.json() as Promise<T>
}

async function englishLabel(kind: 'item' | 'ability' | 'move', slug: string): Promise<string> {
  const key = `${kind}:${slug}`
  const hit = labels.get(key)
  if (hit) return hit
  const data = await getJson<{ names: { language: { name: string }; name: string }[] }>(`${kind}/${slug}`)
  const name = data.names.find((row) => row.language.name === 'en')?.name ?? slug
  labels.set(key, name)
  return name
}

function speciesId(url: string): number {
  const match = /\/(\d+)\/?$/.exec(url)
  return match ? Number(match[1]) : 0
}

function formatOne(detail: EvoDetail, items: Map<string, string>, moves: Map<string, string>): string {
  const bits: string[] = []
  const trigger = detail.trigger?.name
  if (trigger === 'use-item') bits.push(detail.item ? items.get(detail.item.name) ?? 'item' : 'item')
  else if (trigger === 'trade') bits.push('Trade')
  else if (trigger === 'shed') bits.push('an empty party slot and a Poké Ball')
  else if (trigger === 'level-up' && detail.min_level) bits.push(`Level ${detail.min_level}`)
  if (detail.min_happiness) bits.push('high friendship')
  if (detail.min_beauty) bits.push('high beauty')
  if (detail.time_of_day === 'day') bits.push('during the day')
  if (detail.time_of_day === 'night') bits.push('at night')
  if (detail.gender === 1) bits.push('female')
  if (detail.gender === 2) bits.push('male')
  if (detail.held_item) bits.push(`holding ${items.get(detail.held_item.name) ?? 'an item'}`)
  if (detail.known_move) bits.push(`knows ${moves.get(detail.known_move.name) ?? 'a move'}`)
  if (detail.location) bits.push('at a special place')
  if (detail.relative_physical_stats === 1) bits.push('Attack > Defense')
  if (detail.relative_physical_stats === -1) bits.push('Attack < Defense')
  if (detail.relative_physical_stats === 0) bits.push('Attack = Defense')
  if (detail.party_species) {
    const id = speciesId(detail.party_species.url)
    bits.push(`with ${monById(id)?.en ?? 'a partner'} in the party`)
  }
  if (detail.trade_species) {
    const id = speciesId(detail.trade_species.url)
    bits.push(`for ${monById(id)?.en ?? 'a specific species'}`)
  }
  if (trigger === 'level-up' && bits.length === 0) bits.push('Level up')
  return bits.join(', ')
}

function formatDetails(details: EvoDetail[], items: Map<string, string>, moves: Map<string, string>): string {
  return details.map((detail) => formatOne(detail, items, moves)).filter(Boolean).join(' or ')
}

function collect(node: Chain, items: Set<string>, moves: Set<string>): void {
  for (const detail of node.evolution_details ?? []) {
    if (detail.item) items.add(detail.item.name)
    if (detail.held_item) items.add(detail.held_item.name)
    if (detail.known_move) moves.add(detail.known_move.name)
  }
  ;(node.evolves_to ?? []).forEach((child) => collect(child, items, moves))
}

function buildNode(node: Chain, items: Map<string, string>, moves: Map<string, string>, method: string): EvoNode {
  const id = speciesId(node.species.url)
  return {
    id,
    name: monById(id)?.en ?? node.species.name,
    method,
    to: (node.evolves_to ?? []).map((child) => buildNode(child, items, moves, formatDetails(child.evolution_details ?? [], items, moves))),
  }
}

async function fetchWiki(id: number): Promise<WikiMon> {
  const [pokemon, species] = await Promise.all([
    getJson<{
      stats: { base_stat: number; stat: { name: string } }[]
      abilities: { is_hidden: boolean; ability: { name: string } }[]
    }>(`pokemon/${id}`),
    getJson<{ names: { language: { name: string }; name: string }[]; evolution_chain: { url: string } }>(`pokemon-species/${id}`),
  ])
  const chainUrl = species.evolution_chain.url.replace('https://pokeapi.co/api/v2/', '')
  const evolution = await getJson<{ chain: Chain }>(chainUrl)
  const itemSlugs = new Set<string>()
  const moveSlugs = new Set<string>()
  collect(evolution.chain, itemSlugs, moveSlugs)
  const [itemPairs, movePairs, abilities] = await Promise.all([
    Promise.all([...itemSlugs].map(async (slug) => [slug, await englishLabel('item', slug)] as const)),
    Promise.all([...moveSlugs].map(async (slug) => [slug, await englishLabel('move', slug)] as const)),
    Promise.all(pokemon.abilities.map(async (row) => ({
      name: await englishLabel('ability', row.ability.name),
      hidden: row.is_hidden,
    }))),
  ])
  const local = monById(id)
  const name = species.names.find((row) => row.language.name === 'en')?.name ?? local?.en ?? `#${id}`
  return {
    v: 2,
    id,
    name,
    stats: pokemon.stats.map((row) => ({ label: STAT_LABEL[row.stat.name] ?? row.stat.name, value: row.base_stat })),
    abilities,
    chain: buildNode(evolution.chain, new Map(itemPairs), new Map(movePairs), ''),
  }
}

export async function loadWiki(id: number): Promise<WikiMon> {
  if (id < 1 || id > 493) throw new Error('Only Gen 1–4')
  const cached = await readWiki(id)
  if (cached) return cached
  const mon = await fetchWiki(id)
  await writeWiki(mon)
  return mon
}

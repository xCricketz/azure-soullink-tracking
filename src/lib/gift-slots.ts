import giftsData from '../data/unbound/gifts.json'
import { placeByKey, ROUTES, type RouteDef } from '../data/routes'
import { CHERISH_BALL, MAP_SECTIONS } from './save/locations'

export type GiftKind = 'gift' | 'egg' | 'trade'

export interface GiftSource {
  id: string
  after: string | null
  mapsec: number | null
  label: string
  kind: GiftKind
  species: string[]
  level: number | null
  suggest: boolean
  bestEffort: boolean
  note: string
}

export const GIFT_SOURCES = giftsData.sources as GiftSource[]

export interface GiftCandidate {
  ownOT: boolean
  isEgg?: boolean
  name: string | null
  /** Species randomizer: a Cherish Ball matches the place, not the listed species. */
  randomizerSpecies?: boolean
  met: { category: string; location: number; level: number; ball?: number }
}

export interface GiftMatch {
  id: string
  label: string
  kind: GiftKind
  confidence: 'likely' | 'guess'
}

function sameName(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase()
}

function speciesHit(source: GiftSource, name: string): boolean {
  return name.length > 0 && source.species.some((species) => sameName(species, name))
}

function toMatch(source: GiftSource): GiftMatch {
  return {
    id: source.id,
    label: source.label,
    kind: source.kind,
    confidence: source.bestEffort ? 'guess' : 'likely',
  }
}

/** Own OT and a Cherish Ball. The ball is the gift; the species may be randomized. */
function receivedGift(mon: GiftCandidate): boolean {
  if (!mon.ownOT || mon.met.ball !== CHERISH_BALL) return false
  return mon.met.category !== 'foreign-origin' && mon.met.category !== 'in-game-trade' && mon.met.category !== 'fateful-event'
}

function giftOrEggAt(location: number): GiftSource[] {
  return GIFT_SOURCES.filter((source) => source.suggest && source.mapsec === location && (source.kind === 'gift' || source.kind === 'egg'))
}

/**
 * Suggest one NPC slot. Eggs still in the box never reach this.
 * Hatched eggs match an egg source in the met town. Species gifts need own OT,
 * the same met location, and a listed species. Trades need the species and
 * either met location 254 or another trainer's id in that town.
 * A Cherish Ball skips the species list when the randomizer is on, or when
 * that met location has exactly one gift or egg. A level-10 Bellin gift that
 * was received as the Pokémon, not hatched from the egg, still uses the egg slot. No listed source
 * becomes a guessed "<Place> – Gift" slot. Two sources that both fit are left alone.
 */
export function matchGiftSlot(mon: GiftCandidate): GiftMatch | null {
  if (mon.isEgg) return null
  const name = mon.name?.trim() ?? ''
  const hatched = mon.met.category === 'hatched' || mon.met.category === 'special-egg'
  const hits = GIFT_SOURCES.filter((source) => {
    if (!source.suggest || source.mapsec == null) return false
    if (source.level != null && mon.met.level !== source.level) return false
    const named = speciesHit(source, name)
    if (source.kind === 'egg') {
      if (mon.met.location !== source.mapsec) return false
      return hatched || (named && mon.ownOT)
    }
    if (source.kind === 'trade') {
      if (!named) return false
      if (mon.met.category === 'in-game-trade' || mon.met.location === 254) return true
      return !mon.ownOT && mon.met.location === source.mapsec
    }
    return named && mon.ownOT && mon.met.location === source.mapsec && mon.met.category !== 'foreign-origin' && !hatched
  })
  const namedHits = hits.filter((source) => speciesHit(source, name))
  const picked = hits.length === 1 ? hits[0] : namedHits.length === 1 ? namedHits[0] : null
  if (picked) return toMatch(picked)
  if (!receivedGift(mon)) return null
  const present = giftOrEggAt(mon.met.location)
  const pool = present.filter((source) => source.level == null || source.level === mon.met.level)
  const waiveSpecies = Boolean(mon.randomizerSpecies) || present.length === 1
  if (waiveSpecies && pool.length === 1) return toMatch(pool[0])
  if (waiveSpecies) {
    const named = pool.filter((source) => speciesHit(source, name))
    if (named.length === 1) return toMatch(named[0])
  }
  if (present.length === 0) return genericGiftMatch(mon.met.location)
  return null
}

export function genericGiftId(placeKey: string): string {
  return `gift-${placeKey}`
}

/** A guessed gift slot for a place that has no listed gift or egg. */
export function genericGiftDef(placeKey: string): RouteDef | null {
  const id = genericGiftId(placeKey)
  if (GIFT_SOURCES.some((source) => source.id === id)) return null
  const place = placeByKey(placeKey)
  if (!place) return null
  const listed = ROUTES.find((route) => route.name === placeKey)
  return {
    name: id,
    en: `${place.name} – Gift`,
    order: place.order + 0.005,
    group: listed?.group ?? 'Opening',
    kind: 'gift',
  }
}

export function genericGiftFromId(id: string): RouteDef | null {
  if (!id.startsWith('gift-') || GIFT_SOURCES.some((source) => source.id === id)) return null
  return genericGiftDef(id.slice('gift-'.length))
}

export function listedRoute(key: string): RouteDef | null {
  return trackerRoutes().find((item) => item.name === key) ?? genericGiftFromId(key) ?? null
}

function genericGiftMatch(location: number): GiftMatch | null {
  const key = MAP_SECTIONS[String(location)]?.route_id
  if (!key) return null
  const route = genericGiftDef(key)
  if (!route) return null
  return { id: route.name, label: route.en, kind: 'gift', confidence: 'guess' }
}

export function giftRouteDefs(): RouteDef[] {
  const tail = GIFT_SOURCES.filter((source) => source.after == null)
  return GIFT_SOURCES.map((source, index) => {
    const anchor = source.after ? placeByKey(source.after) : undefined
    const siblings = source.after ? GIFT_SOURCES.filter((item) => item.after === source.after) : tail
    const place = siblings.indexOf(source)
    const listed = source.after ? ROUTES.find((route) => route.name === source.after) : undefined
    return {
      name: source.id,
      en: source.label,
      order: source.after ? (anchor?.order ?? 8000) + (place + 1) / 100 : 9000 + index,
      group: source.after ? (listed?.group ?? 'Opening') : 'Gifts',
      kind: source.kind,
    }
  })
}

export const STARTER_ROUTE: RouteDef = {
  name: 'starter',
  en: 'Starter',
  order: 0,
  group: 'Opening',
  kind: 'event',
}

/** Soul-link routes plus the starter slot and one slot per gift source. */
export function trackerRoutes(): RouteDef[] {
  const heights = placeByKey('frozen-heights')
  const frozen = heights
    ? [{ name: heights.key, en: heights.name, order: heights.order, group: 'Opening', kind: heights.kind }]
    : []
  return [STARTER_ROUTE, ...frozen, ...ROUTES, ...giftRouteDefs()].sort((a, b) => a.order - b.order || a.en.localeCompare(b.en, 'en'))
}

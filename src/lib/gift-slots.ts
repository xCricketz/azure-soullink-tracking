import giftsData from '../data/unbound/gifts.json'
import { placeByKey, ROUTES, type RouteDef } from '../data/routes'

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
  met: { category: string; location: number; level: number }
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

/**
 * Suggest one NPC slot. Eggs still in the box never reach this.
 * Hatched eggs match an egg source in the met town. Species gifts need own OT,
 * the same met location, and a listed species. Trades need the species and
 * either met location 254 or another trainer's id in that town.
 * Two sources that both fit are left alone. That is the documented best effort.
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
  if (!picked) return null
  return {
    id: picked.id,
    label: picked.label,
    kind: picked.kind,
    confidence: picked.bestEffort ? 'guess' : 'likely',
  }
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

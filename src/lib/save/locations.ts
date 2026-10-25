import mapsec from '../../data/unbound/mapsec-to-route.json'
import type { MetInfo } from './unbound-save'

/** Cherish Ball in the CFRU ball list. Often a gift, fossil, or event. */
export const CHERISH_BALL = 15

export type MapConfidence = 'verified' | 'likely' | 'guess' | 'unmapped'

export interface MapsecEntry {
  name: string
  route_id: string | null
  confidence: MapConfidence
}

export type MapsecTable = Record<string, MapsecEntry>

export const MAP_SECTIONS: MapsecTable = isTable(mapsec) ? mapsec : {}

export type DecisionKind = 'unmapped' | 'trade' | 'event' | 'hatched' | 'gift'

export interface LocationReading {
  /** A wild catch on a soul-link route. Everything else waits for a decision. */
  place: 'route' | 'needs-decision'
  decision: DecisionKind | null
  route: string | null
  confidence: MapConfidence | null
  placeName: string | null
  source: 'met' | 'none'
}

export function readLocation(
  met: MetInfo,
  ownOT: boolean,
  sections: MapsecTable,
  knownRoutes: Set<string>,
): LocationReading {
  const entry = sections[String(met.mapSectionId)]
  const named = entry?.route_id && knownRoutes.has(entry.route_id) ? entry.route_id : null
  const confidence = entry?.confidence ?? null
  const placeName = entry?.name ?? null
  const base = { confidence, placeName, source: entry ? 'met' as const : 'none' as const }

  if (!ownOT || met.category === 'in-game-trade' || met.category === 'foreign-origin') {
    return { ...base, place: 'needs-decision', decision: 'trade', route: named }
  }
  if (met.category === 'fateful-event') {
    return { ...base, place: 'needs-decision', decision: 'event', route: null, placeName: null, confidence: null }
  }
  if (met.category === 'hatched' || met.category === 'special-egg') {
    return { ...base, place: 'needs-decision', decision: 'hatched', route: named }
  }
  if (met.ball === CHERISH_BALL) {
    return { ...base, place: 'needs-decision', decision: 'gift', route: named }
  }
  if (named && confidence && confidence !== 'unmapped') {
    return { ...base, place: 'route', decision: null, route: named }
  }
  return { ...base, place: 'needs-decision', decision: 'unmapped', route: null }
}

function isTable(value: unknown): value is MapsecTable {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

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

export type DecisionKind = 'unmapped' | 'trade' | 'event' | 'hatched' | 'gift' | 'starter'

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

  // Met location wins over the trainer ID. 255 is an event, 254 is an in-game trade.
  if (met.mapSectionId === 255 || met.category === 'fateful-event') {
    return { ...base, place: 'needs-decision', decision: 'event', route: null, placeName: placeName ?? 'Event', confidence: null }
  }
  if (met.mapSectionId === 254 || met.category === 'in-game-trade') {
    return { ...base, place: 'needs-decision', decision: 'trade', route: named }
  }
  if (!ownOT || met.category === 'foreign-origin') {
    return { ...base, place: 'needs-decision', decision: 'trade', route: named }
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

/** Sentence under an import row. Met location decides the kind; the trainer ID only changes the trade wording. */
export function decisionCopy(input: {
  decision: DecisionKind | null
  mapSectionId: number
  ownOT: boolean
  placeName: string | null
  where: string
  catchLevel?: number
}): string | null {
  if (input.decision === 'gift') {
    return `${input.placeName ?? 'Gift'}. Wiki match, best effort where the note is unclear.`
  }
  if (input.decision === 'starter') {
    const place = input.placeName ?? (input.mapSectionId ? `map section ${input.mapSectionId}` : 'this place')
    const level = input.catchLevel && input.catchLevel > 0 ? `, Lv${input.catchLevel}` : ''
    return `Starter? (met at ${place}${level})`
  }
  if (input.mapSectionId === 88 || input.placeName === 'Frozen Heights') {
    if (input.decision === 'unmapped' || input.decision == null) {
      return 'Frozen Heights (starter town, no Soul-Link route)'
    }
  }
  if (input.decision === 'event') {
    return 'Event Pokémon (met location 255). Confirm all skips this. Pick a route only if it should count.'
  }
  if (input.decision === 'trade' && input.mapSectionId === 254 && input.ownOT) {
    return `In-game trade (${input.where}). This trainer ID matches yours. Confirm all skips this. Confirm it only if this route should count.`
  }
  if (input.decision === 'trade' && input.mapSectionId === 254) {
    return `In-game trade. Caught by another trainer (${input.where}). Confirm all skips this. Confirm it only if this route should count.`
  }
  if (input.decision === 'trade') {
    return `Caught by another trainer (${input.where}). Confirm all skips this. Confirm it only if this route should count.`
  }
  return null
}

function isTable(value: unknown): value is MapsecTable {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

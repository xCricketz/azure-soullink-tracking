import table from '../../data/unbound/map-sections.json'

/** One measured map-section id. Fill `map-sections.json` when that table lands. */
export interface MapSection {
  route?: string
  routes?: string[]
  kind?: 'route' | 'gift' | 'event'
  label?: string
}

export type MapSectionTable = Record<string, MapSection>

export const MAP_SECTIONS: MapSectionTable = isTable(table.sections) ? table.sections : {}

export interface LocationReading {
  place: 'route' | 'needs-route' | 'trade' | 'gift' | 'event'
  route: string | null
  source: 'met' | 'area' | 'none'
  ambiguous: string[]
  label: string | null
}

export function readLocation(
  metLocation: number | null,
  ownOT: boolean,
  sections: MapSectionTable,
  knownRoutes: Set<string>,
): LocationReading {
  const none: LocationReading = { place: 'needs-route', route: null, source: 'none', ambiguous: [], label: null }
  if (!ownOT) return { ...none, place: 'trade' }
  const entry = metLocation == null ? undefined : sections[String(metLocation)]
  if (!entry) return none
  if (entry.kind === 'gift' || entry.kind === 'event') {
    const route = known(entry.route, knownRoutes)
    return { place: entry.kind, route, source: route ? 'met' : 'none', ambiguous: [], label: entry.label ?? null }
  }
  const many = (entry.routes ?? []).map((key) => known(key, knownRoutes)).filter((key): key is string => Boolean(key))
  const one = known(entry.route, knownRoutes)
  if (many.length > 1 || (many.length === 1 && one && many[0] !== one)) {
    const ambiguous = [...new Set(one ? [one, ...many] : many)]
    return { place: 'needs-route', route: null, source: 'met', ambiguous, label: entry.label ?? null }
  }
  const route = one ?? many[0] ?? null
  if (!route) return none
  return { place: 'route', route, source: 'met', ambiguous: [], label: entry.label ?? null }
}

function known(key: string | undefined, routes: Set<string>): string | null {
  return key && routes.has(key) ? key : null
}

function isTable(value: unknown): value is MapSectionTable {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

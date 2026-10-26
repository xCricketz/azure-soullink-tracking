import type { PlayerId } from '../types'
import { MAP_SECTIONS, readLocation, type DecisionKind, type LocationReading, type MapConfidence, type MapsecTable } from './locations'
import { identityOf } from './save-diff'
import type { Mon, ParsedSave } from './unbound-save'

export const UNKNOWN_SPECIES = 'unknown Pokémon'

export interface RouteOption {
  name: string
  en: string
  order: number
  group: string
}

export interface AreaHint {
  key: string
  species: string[]
}

export interface CatchHint {
  player: PlayerId
  dex_id: number | null
  status: string
  pokemon: string | null
  route: string
}

export interface PlannedMon {
  id: string
  where: 'party' | 'box'
  boxIndex: number | null
  boxName: string | null
  slot: number
  speciesId: number
  nat: number | null
  name: string
  /** Species id is missing from the table, or the national number is a placeholder. Shown, never logged. */
  unknown: boolean
  identity: string
  nickname: string
  level: number | null
  levelSource: Mon['levelSource']
  nature: string
  shiny: boolean
  shinyXor: number
  formIndex: number | null
  formNote: string | null
  alreadyLogged: boolean
  newSinceImport: boolean
  mapSectionId: number
  catchLevel: number
  ballName: string | null
  /** Route to show as selected. Null until a met location or an area hint names one. */
  suggestedRoute: string | null
  suggestion: 'met' | 'area' | 'none'
  place: LocationReading['place']
  decision: DecisionKind | null
  confidence: MapConfidence | null
  placeName: string | null
  ownOT: boolean
  /** A later Pokémon on a route that already has a catch, using the suggested route. The sheet recomputes this from the route the player actually picks. */
  duplicate: boolean
  duplicateOf: string | null
}

export interface MissingImport {
  identity: string
  prompt: 'Dead/gone?'
}

export interface ImportPlan {
  mons: PlannedMon[]
  /** Rows offered for confirmation. Once a previous import stored identities, known Pokémon are left out. */
  suggestions: PlannedMon[]
  /** Previously imported identities missing from this save. Display only. Nothing is written. */
  missing: MissingImport[]
  skippedEggs: number
  skippedUnknown: number
  progress: string
}

export function furthestRoute(routes: RouteOption[], catches: Pick<CatchHint, 'route' | 'status' | 'pokemon'>[]): string {
  const ordered = [...routes].sort((a, b) => a.order - b.order)
  const first = ordered[0]
  if (!first) return ''
  let best = first.name
  let bestOrder = first.order
  const caught = new Set(catches.filter((row) => row.pokemon && row.status !== 'missed').map((row) => row.route))
  for (const route of ordered) {
    if (caught.has(route.name) && route.order >= bestOrder) {
      best = route.name
      bestOrder = route.order
    }
  }
  return best
}

export function suggestRoute(
  name: string,
  progress: string,
  routes: RouteOption[],
  areas: AreaHint[],
  randomizerSpecies: boolean,
): { route: string; suggestion: 'progress' | 'area' } {
  if (!randomizerSpecies && name) {
    const progressOrder = routes.find((route) => route.name === progress)?.order ?? 0
    const hits = areas
      .filter((area) => area.species.some((species) => species.toLowerCase() === name.toLowerCase()))
      .map((area) => routes.find((route) => route.name === area.key))
      .filter((route): route is RouteOption => Boolean(route))
      .sort((a, b) => rank(a.order, progressOrder) - rank(b.order, progressOrder))
    if (hits[0]) return { route: hits[0].name, suggestion: 'area' }
  }
  return { route: progress, suggestion: 'progress' }
}

function rank(order: number, progressOrder: number): number {
  return order <= progressOrder ? progressOrder - order : 100000 + order
}

function nicknameOf(mon: Mon): string {
  const nick = mon.nickname.trim()
  if (!nick) return ''
  if (mon.name && nick.toLowerCase() === mon.name.toLowerCase()) return ''
  return nick
}

function planOne(
  mon: Mon,
  boxName: string | null,
  opts: {
    me: PlayerId
    catches: CatchHint[]
    previousIds: Set<string>
    progress: string
    randomizerSpecies: boolean
    routes: RouteOption[]
    areas: AreaHint[]
    sections: MapsecTable
  },
): PlannedMon | 'egg' {
  if (mon.isEgg) return 'egg'
  const unknown = !mon.nat || !mon.name
  const known = new Set(opts.routes.map((route) => route.name))
  const located = readLocation(mon.met, mon.ownOT, opts.sections, known)
  const area = !unknown && located.decision === 'unmapped' && !located.route
    ? suggestRoute(mon.name ?? '', opts.progress, opts.routes, opts.areas, opts.randomizerSpecies)
    : null
  const formNote = !unknown && mon.formIndex && mon.formIndex > 0
    ? `Form ${mon.formIndex} of this species. Soul-Link counts it as the base species. The first catch on a route is the one that stays.`
    : null
  const route = located.route ?? (area?.suggestion === 'area' ? area.route : null)
  const identity = identityOf(mon)
  const seenBefore = opts.previousIds.has(identity)
  return {
    id: mon.where === 'party' ? `party-${mon.slot}` : `box-${mon.box ?? 0}-${mon.slot}`,
    where: mon.where,
    boxIndex: mon.where === 'box' ? mon.box ?? 0 : null,
    boxName,
    slot: mon.slot,
    speciesId: mon.speciesId,
    nat: unknown ? null : mon.nat,
    name: unknown ? UNKNOWN_SPECIES : mon.name ?? UNKNOWN_SPECIES,
    unknown,
    identity,
    nickname: nicknameOf(mon),
    level: mon.level,
    levelSource: mon.levelSource,
    nature: mon.nature,
    shiny: mon.shiny,
    shinyXor: mon.shinyXor,
    formIndex: mon.formIndex,
    formNote,
    alreadyLogged: !unknown && opts.catches.some((row) => row.player === opts.me && row.dex_id === mon.nat && row.status !== 'missed'),
    newSinceImport: !seenBefore,
    mapSectionId: mon.met.mapSectionId,
    catchLevel: mon.met.catchLevel,
    ballName: mon.met.ballName,
    suggestedRoute: route,
    suggestion: located.place === 'route' ? 'met' : area?.suggestion === 'area' ? 'area' : located.route ? 'met' : 'none',
    place: unknown ? 'needs-decision' : located.place,
    decision: unknown ? 'unmapped' : located.decision,
    confidence: located.confidence,
    placeName: located.placeName,
    ownOT: mon.ownOT,
    duplicate: false,
    duplicateOf: null,
  }
}

export function planSave(save: ParsedSave, opts: {
  me: PlayerId
  catches: CatchHint[]
  previousNats: number[]
  previousIds?: string[]
  randomizerSpecies: boolean
  routes: RouteOption[]
  areas: AreaHint[]
  sections?: MapsecTable
}): ImportPlan {
  const progress = furthestRoute(opts.routes, opts.catches)
  const previousIds = new Set(opts.previousIds ?? [])
  const shared = { ...opts, previousIds, progress, sections: opts.sections ?? MAP_SECTIONS }
  const mons: PlannedMon[] = []
  let skippedEggs = 0
  const skippedUnknown = 0
  const take = (mon: Mon, boxName: string | null) => {
    const planned = planOne(mon, boxName, shared)
    if (planned === 'egg') skippedEggs += 1
    else mons.push(planned)
  }
  for (const mon of save.party) take(mon, null)
  for (const box of save.boxes) {
    for (const mon of box.mons) take(mon, box.name)
  }
  markDuplicates(mons, opts.me, opts.catches)
  const present = new Set(mons.map((mon) => mon.identity))
  const known = [...previousIds]
  const suggestions = known.length ? mons.filter((mon) => mon.newSinceImport) : mons
  const missing: MissingImport[] = known.filter((identity, index) => known.indexOf(identity) === index && !present.has(identity))
    .map((identity) => ({ identity, prompt: 'Dead/gone?' }))
  return { mons, suggestions, missing, skippedEggs, skippedUnknown, progress }
}

function markDuplicates(mons: PlannedMon[], me: PlayerId, catches: CatchHint[]) {
  const claimed = new Map<string, string>()
  for (const mon of mons) {
    if (mon.unknown || mon.place !== 'route' || !mon.suggestedRoute) continue
    const route = mon.suggestedRoute
    const logged = catches.find((row) => row.player === me && row.route === route && row.pokemon && row.status !== 'missed')
    const earlier = claimed.get(route)
    if (logged || earlier) {
      mon.duplicate = true
      mon.duplicateOf = earlier ?? logged?.pokemon ?? route
    } else claimed.set(route, mon.name)
  }
}

/** Pokémon whose route came from the save and is still the first catch on that suggested route. These are suggestions, not writes. */
export function detectedImportIds(mons: PlannedMon[]): string[] {
  return mons.filter((mon) => mon.place === 'route' && !mon.duplicate && mon.suggestedRoute).map((mon) => mon.id)
}

export interface RouteDecision {
  duplicate: boolean
  duplicateOf: string | null
}

/**
 * First catch per route, using the routes the player currently has selected.
 * An empty selection claims nothing. A route already logged, or taken by an
 * earlier Pokémon, marks the later one. Rows already confirmed keep their route.
 */
export function liveDecisions(
  mons: PlannedMon[],
  chosen: Record<string, string>,
  catches: Pick<CatchHint, 'player' | 'route' | 'pokemon' | 'status'>[],
  me: PlayerId,
  doneIds: readonly string[] = [],
): Map<string, RouteDecision> {
  const done = new Set(doneIds)
  const claimed = new Map<string, string>()
  const out = new Map<string, RouteDecision>()
  for (const mon of mons) {
    if (!done.has(mon.id)) continue
    const route = chosen[mon.id] ?? ''
    if (route && !claimed.has(route)) claimed.set(route, mon.name)
    out.set(mon.id, { duplicate: false, duplicateOf: null })
  }
  for (const mon of mons) {
    if (done.has(mon.id)) continue
    const route = chosen[mon.id] ?? ''
    if (!route || mon.unknown || mon.nat == null) {
      out.set(mon.id, { duplicate: false, duplicateOf: null })
      continue
    }
    const logged = catches.find((row) => row.player === me && row.route === route && row.pokemon && row.status !== 'missed')
    const earlier = claimed.get(route)
    if (logged || earlier) {
      out.set(mon.id, { duplicate: true, duplicateOf: earlier ?? logged?.pokemon ?? null })
    } else {
      claimed.set(route, mon.name)
      out.set(mon.id, { duplicate: false, duplicateOf: null })
    }
  }
  return out
}

/** Suggested routes that are still the first catch. Rows that need a route, and trades, gifts, and events, are confirmed one at a time. */
export function confirmAllIds(
  mons: PlannedMon[],
  chosen: Record<string, string>,
  decisions: ReadonlyMap<string, RouteDecision>,
  doneIds: readonly string[] = [],
): string[] {
  const done = new Set(doneIds)
  return mons.filter((mon) => {
    if (!mon.newSinceImport || mon.unknown || mon.nat == null || mon.place !== 'route' || done.has(mon.id) || !chosen[mon.id]) return false
    return !decisions.get(mon.id)?.duplicate
  }).map((mon) => mon.id)
}

export function routeClash(ids: string[], chosen: Record<string, string>): boolean {
  const routes = ids.map((id) => chosen[id]).filter(Boolean)
  return new Set(routes).size !== routes.length
}

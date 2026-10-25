import type { PlayerId } from '../types'
import { MAP_SECTIONS, readLocation, type LocationReading, type MapSectionTable } from './locations'
import type { Mon, ParsedSave } from './unbound-save'

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
  nat: number
  name: string
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
  metLocation: number
  metLevel: number
  /** Route to show as selected. Null until a met location or an area hint names one. */
  suggestedRoute: string | null
  suggestion: 'met' | 'area' | 'none'
  place: LocationReading['place']
  /** Other routes the same map section might be. The player still chooses. */
  ambiguous: string[]
  placeLabel: string | null
  /** A later Pokémon on a route that already has a catch, using the suggested route. The sheet recomputes this from the route the player actually picks. */
  duplicate: boolean
  duplicateOf: string | null
}

export interface ImportPlan {
  mons: PlannedMon[]
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
    previous: Set<number>
    progress: string
    randomizerSpecies: boolean
    routes: RouteOption[]
    areas: AreaHint[]
    sections: MapSectionTable
  },
): PlannedMon | 'egg' | 'unknown' {
  if (mon.isEgg) return 'egg'
  if (!mon.nat || !mon.name) return 'unknown'
  const known = new Set(opts.routes.map((route) => route.name))
  const located = readLocation(mon.metLocation, mon.ownOT, opts.sections, known)
  const area = located.place === 'needs-route' && located.ambiguous.length === 0
    ? suggestRoute(mon.name, opts.progress, opts.routes, opts.areas, opts.randomizerSpecies)
    : null
  const formNote = mon.formIndex && mon.formIndex > 0
    ? `Form index ${mon.formIndex}. Stored as the base species. The save does not name the form.`
    : null
  const route = located.route ?? (area?.suggestion === 'area' ? area.route : null)
  return {
    id: mon.where === 'party' ? `party-${mon.slot}` : `box-${mon.box ?? 0}-${mon.slot}`,
    where: mon.where,
    boxIndex: mon.where === 'box' ? mon.box ?? 0 : null,
    boxName,
    slot: mon.slot,
    nat: mon.nat,
    name: mon.name,
    nickname: nicknameOf(mon),
    level: mon.level,
    levelSource: mon.levelSource,
    nature: mon.nature,
    shiny: mon.shiny,
    shinyXor: mon.shinyXor,
    formIndex: mon.formIndex,
    formNote,
    alreadyLogged: opts.catches.some((row) => row.player === opts.me && row.dex_id === mon.nat && row.status !== 'missed'),
    newSinceImport: !opts.previous.has(mon.nat),
    metLocation: mon.metLocation,
    metLevel: mon.metLevel,
    suggestedRoute: route,
    suggestion: located.source === 'met' ? 'met' : area?.suggestion === 'area' ? 'area' : 'none',
    place: located.place,
    ambiguous: located.ambiguous,
    placeLabel: located.label,
    duplicate: false,
    duplicateOf: null,
  }
}

export function planSave(save: ParsedSave, opts: {
  me: PlayerId
  catches: CatchHint[]
  previousNats: number[]
  randomizerSpecies: boolean
  routes: RouteOption[]
  areas: AreaHint[]
  sections?: MapSectionTable
}): ImportPlan {
  const progress = furthestRoute(opts.routes, opts.catches)
  const previous = new Set(opts.previousNats)
  const shared = { ...opts, previous, progress, sections: opts.sections ?? MAP_SECTIONS }
  const mons: PlannedMon[] = []
  let skippedEggs = 0
  let skippedUnknown = 0
  const take = (mon: Mon, boxName: string | null) => {
    const planned = planOne(mon, boxName, shared)
    if (planned === 'egg') skippedEggs += 1
    else if (planned === 'unknown') skippedUnknown += 1
    else mons.push(planned)
  }
  for (const mon of save.party) take(mon, null)
  for (const box of save.boxes) {
    for (const mon of box.mons) take(mon, box.name)
  }
  markDuplicates(mons, opts.me, opts.catches)
  return { mons, skippedEggs, skippedUnknown, progress }
}

function markDuplicates(mons: PlannedMon[], me: PlayerId, catches: CatchHint[]) {
  const claimed = new Map<string, string>()
  for (const mon of mons) {
    if (mon.place !== 'route' || !mon.suggestedRoute) continue
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
    if (!route) {
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
    if (mon.place !== 'route' || done.has(mon.id) || !chosen[mon.id]) return false
    return !decisions.get(mon.id)?.duplicate
  }).map((mon) => mon.id)
}

export function routeClash(ids: string[], chosen: Record<string, string>): boolean {
  const routes = ids.map((id) => chosen[id]).filter(Boolean)
  return new Set(routes).size !== routes.length
}

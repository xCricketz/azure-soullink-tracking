import type { PlayerId } from '../types'
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
  suggestedRoute: string
  suggestion: 'progress' | 'area'
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
  },
): PlannedMon | 'egg' | 'unknown' {
  if (mon.isEgg) return 'egg'
  if (!mon.nat || !mon.name) return 'unknown'
  const suggested = suggestRoute(mon.name, opts.progress, opts.routes, opts.areas, opts.randomizerSpecies)
  const formNote = mon.formIndex && mon.formIndex > 0
    ? `Form index ${mon.formIndex}. Stored as the base species. The save does not name the form.`
    : null
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
    suggestedRoute: suggested.route,
    suggestion: suggested.suggestion,
  }
}

export function planSave(save: ParsedSave, opts: {
  me: PlayerId
  catches: CatchHint[]
  previousNats: number[]
  randomizerSpecies: boolean
  routes: RouteOption[]
  areas: AreaHint[]
}): ImportPlan {
  const progress = furthestRoute(opts.routes, opts.catches)
  const previous = new Set(opts.previousNats)
  const shared = { ...opts, previous, progress }
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
  return { mons, skippedEggs, skippedUnknown, progress }
}

export function routeClash(ids: string[], chosen: Record<string, string>): boolean {
  const routes = ids.map((id) => chosen[id]).filter(Boolean)
  return new Set(routes).size !== routes.length
}

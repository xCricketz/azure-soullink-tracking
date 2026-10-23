import { CUSTOM_ORDER_START, ROUTES, groupTitle, type RouteDef } from '../data/routes'
import type { Catch, CustomRoute, PlayerId, RouteFilter, Status } from './types'
import { norm } from './text'

export interface RouteRow {
  route: RouteDef
  fisi?: Catch
  seri?: Catch
}

export function buildRouteList(catches: Catch[], custom: CustomRoute[]): RouteDef[] {
  const map = new Map<string, RouteDef>()
  for (const route of ROUTES) map.set(route.name, route)
  for (const route of custom) {
    if (!map.has(route.name)) {
      map.set(route.name, { name: route.name, en: route.name, order: route.order, group: 'Custom' })
    }
  }
  for (const catchRow of catches) {
    if (!map.has(catchRow.route)) {
      map.set(catchRow.route, {
        name: catchRow.route,
        en: catchRow.route,
        order: catchRow.route_order ?? CUSTOM_ORDER_START,
        group: 'Custom',
      })
    }
  }
  return [...map.values()].sort((a, b) => a.order - b.order || a.en.localeCompare(b.en, 'en'))
}

export function pairRows(catches: Catch[], custom: CustomRoute[]): RouteRow[] {
  const byRoute = new Map<string, RouteRow>()
  for (const route of buildRouteList(catches, custom)) {
    byRoute.set(route.name, { route })
  }
  for (const catchRow of catches) {
    const row = byRoute.get(catchRow.route)
    if (!row) continue
    row[catchRow.player] = catchRow
  }
  return [...byRoute.values()]
}

export function isLinked(fisi?: Catch, seri?: Catch): boolean {
  return Boolean(fisi && seri && fisi.status !== 'missed' && seri.status !== 'missed')
}

export function matchesFilter(row: RouteRow, filter: RouteFilter): boolean {
  const { fisi, seri } = row
  if (filter === 'all') return true
  if (filter === 'open') return !fisi || !seri
  if (filter === 'pairs') return isLinked(fisi, seri)
  return fisi?.status === filter || seri?.status === filter
}

export function matchesQuery(row: RouteRow, query: string): boolean {
  const needle = norm(query)
  if (!needle) return true
  const hay = [
    row.route.name,
    row.route.en,
    row.route.group,
    groupTitle(row.route.group),
    row.fisi?.pokemon,
    row.fisi?.nickname,
    row.seri?.pokemon,
    row.seri?.nickname,
  ]
  return hay.some((part) => part && norm(part).includes(needle))
}

export function nextOpenRoute(rows: RouteRow[], me: PlayerId): RouteDef | null {
  return rows.find((row) => !row[me])?.route ?? null
}

export function findRoute(name: string, custom: CustomRoute[]): RouteDef | null {
  const official = ROUTES.find((route) => norm(route.name) === norm(name) || norm(route.en) === norm(name))
  if (official) return official
  const extra = custom.find((route) => norm(route.name) === norm(name))
  if (extra) return { name: extra.name, en: extra.name, order: extra.order, group: 'Custom' }
  return null
}

export function countAlive(catches: Catch[]): number {
  return catches.filter((row) => row.status === 'alive').length
}

export function countDead(catches: Catch[]): number {
  return catches.filter((row) => row.status === 'dead').length
}

export function countPairs(rows: RouteRow[]): number {
  return rows.filter((row) => isLinked(row.fisi, row.seri)).length
}

export function pairKind(fisi?: Catch, seri?: Catch): 'open' | 'half' | 'linked' | 'split' | 'dead' | 'miss' {
  if (!fisi && !seri) return 'open'
  if (fisi?.status === 'dead' || seri?.status === 'dead') return 'dead'
  if (fisi?.status === 'missed' || seri?.status === 'missed') return 'miss'
  if (fisi && seri) {
    const teamBox =
      (fisi.in_team && seri.status === 'boxed') ||
      (seri.in_team && fisi.status === 'boxed') ||
      (fisi.status === 'alive' && seri.status === 'boxed') ||
      (seri.status === 'alive' && fisi.status === 'boxed')
    if (teamBox || fisi.status !== seri.status) return 'split'
    return 'linked'
  }
  return 'half'
}

export function graveRows(rows: RouteRow[]): RouteRow[] {
  return rows
    .filter((row) => row.fisi?.status === 'dead' || row.seri?.status === 'dead')
    .sort((a, b) => {
      const aTime = a.fisi?.died_at || a.seri?.died_at || ''
      const bTime = b.fisi?.died_at || b.seri?.died_at || ''
      return bTime.localeCompare(aTime)
    })
}

export function chainBroken(fisi?: Catch, seri?: Catch): boolean {
  if (!fisi || !seri) return true
  return fisi.status === 'dead' || seri.status === 'dead' || fisi.status === 'missed' || seri.status === 'missed'
}

export function bothAlive(fisi?: Catch, seri?: Catch): boolean {
  return fisi?.status === 'alive' && seri?.status === 'alive'
}

export function statusRank(status: Status): number {
  if (status === 'dead') return 3
  if (status === 'missed') return 2
  if (status === 'boxed') return 1
  return 0
}

import gifts from './unbound/gifts.json'
import raw from './unbound/routes.json'

export interface RouteDef {
  name: string
  en: string
  order: number
  group: string
  kind: string
  optional?: boolean
  boss?: string
  gym?: string
}

interface RawNode {
  key: string
  name: string
  order: number
  kind: string
  boss?: string
  neighbours: string[]
  optional: boolean
  soullink_route: boolean
}

const ALL = raw as RawNode[]
const byKey = new Map(ALL.map((node) => [node.key, node]))

export interface GymInfo {
  key: string
  name: string
  city: string
  cityKey: string
  boss: string
  leader: string
  order: number
  badge: number
}

function leaderName(boss: string): string {
  return boss.split('(')[0]?.trim() || boss
}

/** Gym buildings are not their own soul-link routes. The boss hangs off the town. */
export const GYMS: GymInfo[] = ALL.filter((node) => node.kind === 'gym')
  .sort((a, b) => a.order - b.order)
  .map((node, index) => {
    const cityKey = node.neighbours.find((key) => byKey.get(key)?.kind === 'town') ?? node.neighbours[0] ?? node.key
    return {
      key: node.key,
      name: node.name,
      city: byKey.get(cityKey)?.name ?? cityKey,
      cityKey,
      boss: node.boss ?? node.name,
      leader: leaderName(node.boss ?? node.name),
      order: node.order,
      badge: index + 1,
    }
  })

const gymByTown = new Map(GYMS.map((gym) => [gym.cityKey, gym]))

function groupFor(node: RawNode): string {
  if (node.optional) return 'Side areas'
  let badge = 0
  for (const gym of GYMS) {
    if (node.order > gym.order) badge = gym.badge
  }
  if (badge <= 0) return 'Opening'
  return `Badge ${badge}`
}

/** Soul-link areas in story order. `name` is the stored pair key. */
export const ROUTES: RouteDef[] = ALL.filter((node) => node.soullink_route)
  .sort((a, b) => a.order - b.order)
  .map((node) => ({
    name: node.key,
    en: node.name,
    order: node.order,
    group: groupFor(node),
    kind: node.kind,
    optional: node.optional || undefined,
    boss: node.boss,
    gym: gymByTown.get(node.key)?.boss,
  }))

export const MAP_PLACES: RawNode[] = ALL.filter((node) => node.kind !== 'gym')

export const CUSTOM_ORDER_START = 10000

export function routeTitle(route: { name: string; en: string }): string {
  return route.en || route.name
}

export function routeTitleByKey(name: string): string {
  if (name === 'starter') return 'Starter'
  const gift = (gifts.sources as { id: string; label: string }[]).find((source) => source.id === name)
  if (gift) return gift.label
  return ROUTES.find((route) => route.name === name)?.en || byKey.get(name)?.name || name
}

export function groupTitle(group: string): string {
  return group
}

export function placeByKey(key: string): RawNode | undefined {
  return byKey.get(key)
}

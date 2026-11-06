import type { PlayerId } from './types'

export interface StoryCatch {
  player: PlayerId
  pokemon: string | null
  nickname: string | null
  route: string
  status: string
  death_cause: string | null
  created_at: string
  died_at: string | null
}

export interface StoryEvent {
  at: string
  kind: 'catch' | 'death'
  player: PlayerId
  name: string
  route: string
  cause: string | null
}

export interface RunStory {
  deathsByPlayer: Record<PlayerId, number>
  deathsByRoute: { route: string; count: number }[]
  causes: { cause: string; count: number }[]
  timeline: StoryEvent[]
}

function nameOf(row: Pick<StoryCatch, 'nickname' | 'pokemon'>): string {
  return row.nickname?.trim() || row.pokemon?.trim() || 'A Pokémon'
}

/** Deaths, causes, and a time order of catches and faints. Read-only. */
export function runStory(catches: StoryCatch[]): RunStory {
  const deaths = catches.filter((row) => row.status === 'dead')
  const deathsByPlayer: Record<PlayerId, number> = { fisi: 0, seri: 0 }
  const routes = new Map<string, number>()
  const causes = new Map<string, number>()
  for (const row of deaths) {
    deathsByPlayer[row.player] += 1
    routes.set(row.route, (routes.get(row.route) ?? 0) + 1)
    const cause = row.death_cause?.trim() || 'No cause written'
    causes.set(cause, (causes.get(cause) ?? 0) + 1)
  }
  const timeline: StoryEvent[] = []
  for (const row of catches) {
    if (row.status === 'missed' || !row.pokemon) continue
    timeline.push({ at: row.created_at, kind: 'catch', player: row.player, name: nameOf(row), route: row.route, cause: null })
    if (row.status === 'dead' && row.died_at) {
      timeline.push({ at: row.died_at, kind: 'death', player: row.player, name: nameOf(row), route: row.route, cause: row.death_cause })
    }
  }
  timeline.sort((a, b) => a.at.localeCompare(b.at) || a.kind.localeCompare(b.kind))
  const rank = (map: Map<string, number>, key: 'route' | 'cause') => [...map.entries()]
    .map(([name, count]) => ({ [key]: name, count }))
    .sort((a, b) => b.count - a.count || String(a[key]).localeCompare(String(b[key])))
  return {
    deathsByPlayer,
    deathsByRoute: rank(routes, 'route') as { route: string; count: number }[],
    causes: rank(causes, 'cause') as { cause: string; count: number }[],
    timeline,
  }
}

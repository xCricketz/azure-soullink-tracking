export type PlayerId = 'fisi' | 'seri'
export type Status = 'alive' | 'boxed' | 'dead' | 'missed'
export type ThemeChoice = 'dark' | 'light' | 'system'
export type TabId = 'routes' | 'team' | 'grave' | 'guide' | 'more'
export type SyncState = 'live' | 'syncing' | 'offline'
export type RouteFilter = 'all' | 'open' | 'alive' | 'boxed' | 'dead' | 'missed' | 'pairs'
export type TeamView = 'mine' | 'partner' | 'both'

export interface Catch {
  id: string
  run_id: string
  player: PlayerId
  route: string
  route_order: number | null
  pokemon: string | null
  dex_id: number | null
  nickname: string | null
  status: Status
  in_team: boolean
  team_order: number | null
  level: number | null
  note: string | null
  death_cause: string | null
  epitaph: string | null
  died_at: string | null
  created_at: string
  updated_at: string
}

export interface Run {
  id: string
  name: string
  rules: string | null
  active: boolean
  badges?: number
  level_cap?: number | null
  created_at: string
  updated_at: string
}

export interface LoginCard {
  last_at: string | null
  team_count: number
  dex_ids: number[] | null
}

export interface LoginPreview {
  badges: number
  players: Partial<Record<PlayerId, LoginCard>>
}

export interface CatchDraft {
  route: string
  routeOrder: number
  dexId: number | null
  pokemon: string | null
  nickname: string
  status: Status
  level: string
  note: string
  deathCause: string
  epitaph: string
}

export interface CustomRoute {
  name: string
  order: number
}

export interface Settings {
  theme: ThemeChoice
  dupeClause: boolean
  typeClause: boolean
  badges: number
  installDismissed: boolean
  milestones: string[]
  notify: boolean
}

export interface DeathPrompt {
  next: Catch
  previous: Catch | null
  partner: Catch
}

export const PLAYERS: Record<
  PlayerId,
  { id: PlayerId; name: string; possessive: string; email: string; letter: string; device: string }
> = {
  fisi: { id: 'fisi', name: 'Fisi', possessive: 'Fisis', email: 'fisi@soullink.app', letter: 'F', device: 'Android' },
  seri: { id: 'seri', name: 'Seri', possessive: 'Seris', email: 'seri@soullink.app', letter: 'S', device: 'iPhone' },
}

export function otherPlayer(id: PlayerId): PlayerId {
  return id === 'fisi' ? 'seri' : 'fisi'
}

export function playerFromEmail(email?: string | null): PlayerId | null {
  const value = email?.toLowerCase() ?? ''
  if (value.startsWith('fisi@')) return 'fisi'
  if (value.startsWith('seri@')) return 'seri'
  return null
}

export const DEFAULT_RULES = `Soul-Link Nuzlocke – Azure Platinum

• Erster Fang pro Route zählt. Eine belegte Route ist tabu.
• Fällt ein Pokémon, stirbt der Seelenpartner mit.
• Nur verlinkte, lebende Paare gehören ins Team.
• Liegt der Partner in der Box oder ist die Route verpasst, ist das Paar gespalten.
• Optional: Dupes-Clause und Typen-Clause schaltet ihr unter Mehr ein.`

export const GREETINGS = [
  'Sinnoh wartet.',
  'Heute stirbt keiner. Hoffentlich.',
  'Die Kette hält.',
  'Ein Ball. Eine Chance.',
  'Route für Route.',
  'Giratina schaut zu.',
  'Box ist auch eine Strategie.',
  'Nicht hetzen. Der erste Fang zählt.',
]

export function greetingLine(): string {
  const index = new Date().getDate() % GREETINGS.length
  return GREETINGS[index] ?? GREETINGS[0]
}

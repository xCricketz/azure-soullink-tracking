export type PlayerId = 'fisi' | 'seri'
export type Status = 'alive' | 'boxed' | 'dead' | 'missed'
export type ThemeChoice = 'dark' | 'light' | 'system'
export type TabId = 'routes' | 'team' | 'grave' | 'wiki' | 'map' | 'more'
export type CapMode = 'vanilla' | 'difficult'
export type Difficulty = 'vanilla' | 'difficult' | 'expert' | 'insane'
export type SpeciesClause = 'off' | 'player' | 'both'
export type DexOrder = 'borrius' | 'national'
export type SyncState = 'live' | 'syncing' | 'offline'
export type RouteFilter = 'all' | 'open' | 'alive' | 'boxed' | 'dead' | 'missed' | 'pairs'
export type TeamView = 'mine' | 'partner' | 'both'

export interface Catch {
  id: string
  run_id: string
  player: PlayerId
  route: string
  /** May be fractional so a gift slot can sit between two whole route orders. */
  route_order: number | null
  pokemon: string | null
  dex_id: number | null
  /** Unbound form (Alolan, Galarian, …). Null is the base species. National number stays in dex_id. */
  form: string | null
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

export interface RunOptions {
  randomizerSpecies: boolean
  randomizerMoves: boolean
  randomizerAbilities: boolean
  difficulty: Difficulty
  levelCapOn: boolean
  mansionDone: boolean
  ngPlus: boolean
  /** Up to six names from a previous save. Level 10 in the game. Not route encounters. */
  carried: string[]
  sandbox: boolean
  speciesClause: SpeciesClause
}

export interface Run {
  id: string
  name: string
  rules: string | null
  active: boolean
  badges?: number
  level_cap?: number | null
  options?: unknown
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
  form: string | null
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
  capMode: CapMode
  mansionDone: boolean
  showGen8: boolean
  dexOrder: DexOrder
  reduceMotion: boolean
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
  fisi: { id: 'fisi', name: 'Fisi', possessive: "Fisi's", email: 'fisi@soullink.app', letter: 'F', device: 'Android' },
  seri: { id: 'seri', name: 'Seri', possessive: "Seri's", email: 'seri@soullink.app', letter: 'S', device: 'iPhone' },
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

export const DEFAULT_RULES = `Fisi's Tracker – Pokémon Unbound

• First catch on each route counts. A taken route is off limits.
• If a Pokémon faints, its soul partner faints too.
• Only linked, living pairs belong in the team.
• If the partner is boxed or the route was missed, the pair is split.
• Optional: Dupes Clause and Type Clause are under More.`

export const GREETINGS = [
  'Borrius is waiting.',
  'Nobody dies today. Hopefully.',
  'The chain holds.',
  'One ball. One chance.',
  'Route by route.',
  'The shadows are watching.',
  'The box is a strategy.',
  'Don’t rush. The first catch counts.',
]

export function greetingLine(): string {
  const index = new Date().getDate() % GREETINGS.length
  return GREETINGS[index] ?? GREETINGS[0]
}

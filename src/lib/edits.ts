import type { Catch, CatchDraft, PlayerId, Status } from './types'
import { clip } from './text'

export function teamOf(catches: Catch[], player: PlayerId): Catch[] {
  return catches
    .filter((row) => row.player === player && row.in_team && row.status === 'alive')
    .sort((a, b) => (a.team_order ?? 99) - (b.team_order ?? 99) || a.created_at.localeCompare(b.created_at))
}

export function nextTeamOrder(catches: Catch[], player: PlayerId): number {
  const orders = teamOf(catches, player).map((row) => row.team_order ?? 0)
  return orders.length ? Math.max(...orders) + 1 : 1
}

export function buildRow(
  draft: CatchDraft,
  existing: Catch | null,
  me: PlayerId,
  runId: string,
  catches: Catch[],
): Catch {
  const now = new Date().toISOString()
  const missed = draft.status === 'missed'
  const level = Number(draft.level)
  let inTeam = false
  let teamOrder: number | null = null
  if (draft.status === 'alive') {
    if (existing?.status === 'alive' && existing.in_team) {
      inTeam = true
      teamOrder = existing.team_order
    } else if (!existing && teamOf(catches, me).length < 6) {
      inTeam = true
      teamOrder = nextTeamOrder(catches, me)
    }
  }
  return {
    id: existing?.id ?? crypto.randomUUID(),
    run_id: runId,
    player: me,
    route: draft.route,
    route_order: draft.routeOrder,
    pokemon: missed ? null : draft.pokemon,
    dex_id: missed ? null : draft.dexId,
    nickname: missed ? null : clip(draft.nickname, 24) || null,
    status: draft.status,
    in_team: inTeam,
    team_order: inTeam ? teamOrder : null,
    level: !missed && Number.isFinite(level) && level > 0 ? Math.min(100, Math.round(level)) : null,
    note: clip(draft.note, 280) || null,
    death_cause: draft.status === 'dead' ? clip(draft.deathCause, 160) || existing?.death_cause || null : existing?.death_cause ?? null,
    epitaph: draft.status === 'dead' ? clip(draft.epitaph, 140) || existing?.epitaph || null : existing?.epitaph ?? null,
    died_at: draft.status === 'dead' ? existing?.died_at ?? now : null,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  }
}

export function withStatus(row: Catch, status: Status): Catch {
  const now = new Date().toISOString()
  const missed = status === 'missed'
  return {
    ...row,
    status,
    in_team: status === 'alive' ? row.in_team : false,
    team_order: status === 'alive' ? row.team_order : null,
    pokemon: missed ? null : row.pokemon,
    dex_id: missed ? null : row.dex_id,
    nickname: missed ? null : row.nickname,
    died_at: status === 'dead' ? row.died_at ?? now : null,
    updated_at: now,
  }
}

export function asDead(row: Catch, cause?: string | null): Catch {
  const now = new Date().toISOString()
  return {
    ...row,
    status: 'dead',
    in_team: false,
    team_order: null,
    died_at: row.died_at ?? now,
    death_cause: cause?.trim() || row.death_cause,
    updated_at: now,
  }
}

export function asAlive(row: Catch): Catch {
  return {
    ...row,
    status: 'alive',
    in_team: false,
    team_order: null,
    died_at: null,
    updated_at: new Date().toISOString(),
  }
}

export function placeRow(row: Catch, where: 'team' | 'box', catches: Catch[]): Catch | 'full' {
  const now = new Date().toISOString()
  if (where === 'box') {
    return { ...row, status: 'boxed', in_team: false, team_order: null, died_at: null, updated_at: now }
  }
  const team = teamOf(catches, row.player)
  if (!row.in_team && team.length >= 6) return 'full'
  return {
    ...row,
    status: 'alive',
    in_team: true,
    team_order: row.in_team ? row.team_order : nextTeamOrder(catches, row.player),
    died_at: null,
    updated_at: now,
  }
}

export function reorderTeam(catches: Catch[], player: PlayerId, id: string, dir: -1 | 1): Catch[] | null {
  const team = teamOf(catches, player)
  const index = team.findIndex((row) => row.id === id)
  const nextIndex = index + dir
  if (index < 0 || nextIndex < 0 || nextIndex >= team.length) return null
  const copy = [...team]
  const [item] = copy.splice(index, 1)
  if (!item) return null
  copy.splice(nextIndex, 0, item)
  const now = new Date().toISOString()
  const updates = new Map(copy.map((row, order) => [row.id, { ...row, team_order: order + 1, updated_at: now }]))
  return catches.map((row) => updates.get(row.id) ?? row)
}

export function upsertLocal(catches: Catch[], row: Catch): Catch[] {
  const index = catches.findIndex((item) => item.id === row.id)
  if (index === -1) return [...catches, row]
  const next = [...catches]
  next[index] = row
  return next
}

export function partnerNeedsDeath(row: Catch, catches: Catch[]): Catch | null {
  const partner = catches.find((item) => item.player !== row.player && item.route === row.route)
  if (!partner) return null
  if (partner.status === 'dead' || partner.status === 'missed') return null
  return partner
}

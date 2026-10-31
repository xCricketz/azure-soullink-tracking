import type { Catch, Status } from './types'

/** Fields a draft can mean to change. Omitted means leave the saved row alone. */
export interface LifecycleIntent {
  status: boolean
  team: boolean
  death: boolean
}

export const KEEP_LIFECYCLE: LifecycleIntent = { status: false, team: false, death: false }

export interface LoggedCatch {
  id: string
  pokemon: string | null
  dex_id: number | null
  nickname: string | null
  status: Status
  in_team: boolean
  team_order: number | null
  death_cause: string | null
  epitaph: string | null
  died_at: string | null
  created_at?: string
}

function norm(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? ''
}

/**
 * Same catch when the species matches and, if both nicknames are set, those match too.
 * A blank nickname on either side does not make it a different Pokémon.
 */
export function sameLoggedCatch(existing: Pick<LoggedCatch, 'pokemon' | 'dex_id' | 'nickname'>, incoming: Pick<LoggedCatch, 'pokemon' | 'dex_id' | 'nickname'>): boolean {
  const species = existing.dex_id != null && incoming.dex_id != null
    ? existing.dex_id === incoming.dex_id
    : norm(existing.pokemon) !== '' && norm(existing.pokemon) === norm(incoming.pokemon)
  if (!species) return false
  const left = norm(existing.nickname)
  const right = norm(incoming.nickname)
  if (left && right) return left === right
  return true
}

export function takenCatchLabel(row: Pick<LoggedCatch, 'nickname' | 'pokemon'>): string {
  return row.nickname?.trim() || row.pokemon?.trim() || 'another Pokémon'
}

export function routeTakenReason(existingName: string): string {
  return `This route already has your catch: ${existingName}.`
}

/** Import sets status. Team and death stay unless the draft actually carries them. */
export function lifecycleFromDraft(draft: { status: Status; deathCause: string; epitaph: string }): LifecycleIntent {
  return {
    status: true,
    team: false,
    death: draft.status === 'dead' || draft.deathCause.trim().length > 0 || draft.epitaph.trim().length > 0,
  }
}

/**
 * Reuse the existing row id only for the same catch.
 * Status, team, and death stay as saved unless this write explicitly sets them.
 */
export function mergeSameCatch(existing: LoggedCatch, incoming: Catch, intent: LifecycleIntent): Catch | null {
  if (!sameLoggedCatch(existing, incoming)) return null
  return {
    ...incoming,
    id: existing.id,
    created_at: existing.created_at ?? incoming.created_at,
    status: intent.status ? incoming.status : existing.status,
    in_team: intent.team ? incoming.in_team : existing.in_team,
    team_order: intent.team ? incoming.team_order : existing.team_order,
    death_cause: intent.death ? incoming.death_cause : existing.death_cause,
    epitaph: intent.death ? incoming.epitaph : existing.epitaph,
    died_at: intent.death ? incoming.died_at : existing.died_at,
  }
}

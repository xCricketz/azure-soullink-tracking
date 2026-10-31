import assert from 'node:assert/strict'
import { test } from 'node:test'
import { KEEP_LIFECYCLE, lifecycleFromDraft, mergeSameCatch, routeTakenReason, takenCatchLabel, type LoggedCatch } from '../src/lib/catch-clash.ts'
import { confirmFailureText } from '../src/lib/save/plan.ts'
import type { Catch } from '../src/lib/types.ts'

function catchRow(partial: Partial<Catch>): Catch {
  return {
    id: 'new-id',
    run_id: 'run',
    player: 'seri',
    route: 'starter',
    route_order: 0,
    pokemon: 'Kyurem',
    dex_id: 646,
    form: null,
    nickname: 'Orsted',
    status: 'alive',
    in_team: true,
    team_order: 1,
    level: 50,
    note: 'Imported from a save.',
    death_cause: null,
    epitaph: null,
    died_at: null,
    created_at: '2026-10-31T23:10:00.000Z',
    updated_at: '2026-10-31T23:10:00.000Z',
    ...partial,
  }
}

function logged(partial: Partial<LoggedCatch>): LoggedCatch {
  return {
    id: 'saved-id',
    pokemon: 'Kyurem',
    dex_id: 646,
    nickname: 'Orsted',
    status: 'dead',
    in_team: false,
    team_order: null,
    death_cause: 'a wild trainer',
    epitaph: 'Gone',
    died_at: '2026-10-31T23:12:00.000Z',
    created_at: '2026-10-31T22:00:00.000Z',
    ...partial,
  }
}

test('the same species takes over the existing id and leaves status and death alone', () => {
  const existing = logged({})
  const incoming = catchRow({})
  const merged = mergeSameCatch(existing, incoming, KEEP_LIFECYCLE)
  assert.ok(merged)
  assert.equal(merged?.id, 'saved-id')
  assert.equal(merged?.pokemon, 'Kyurem')
  assert.equal(merged?.level, 50)
  assert.equal(merged?.status, 'dead')
  assert.equal(merged?.in_team, false)
  assert.equal(merged?.team_order, null)
  assert.equal(merged?.death_cause, 'a wild trainer')
  assert.equal(merged?.epitaph, 'Gone')
  assert.equal(merged?.died_at, '2026-10-31T23:12:00.000Z')
  const explicit = mergeSameCatch(existing, incoming, { status: true, team: true, death: false })
  assert.equal(explicit?.status, 'alive')
  assert.equal(explicit?.in_team, true)
  assert.equal(explicit?.death_cause, 'a wild trainer')
})

test('a different species is refused and the toast names the catch already there', () => {
  const existing = logged({ pokemon: 'Steenee', dex_id: 762, nickname: 'Roxy' })
  const incoming = catchRow({ pokemon: 'Kyurem', dex_id: 646, nickname: 'Orsted' })
  assert.equal(mergeSameCatch(existing, incoming, { status: true, team: true, death: true }), null)
  const text = confirmFailureText('Kyurem', 'Orsted', 'Starter', routeTakenReason(takenCatchLabel(existing)))
  assert.equal(text, 'Kyurem ‘Orsted’ on Starter was not saved. This route already has your catch: Roxy.')
  const renamed = logged({ nickname: 'Other' })
  assert.equal(mergeSameCatch(renamed, incoming, KEEP_LIFECYCLE), null)
})

test('a blank nickname still matches, and a draft does not touch team or an empty death', () => {
  const existing = logged({})
  const incoming = catchRow({ nickname: '' })
  assert.equal(mergeSameCatch(existing, incoming, KEEP_LIFECYCLE)?.id, 'saved-id')
  const draft = lifecycleFromDraft({ status: 'boxed', deathCause: '', epitaph: '' })
  assert.deepEqual(draft, { status: true, team: false, death: false })
  const merged = mergeSameCatch(existing, catchRow({ status: 'boxed', in_team: true }), draft)
  assert.equal(merged?.status, 'boxed')
  assert.equal(merged?.in_team, false)
  assert.equal(merged?.death_cause, 'a wild trainer')
  assert.equal(merged?.died_at, '2026-10-31T23:12:00.000Z')
  assert.equal(lifecycleFromDraft({ status: 'dead', deathCause: '', epitaph: '' }).death, true)
})

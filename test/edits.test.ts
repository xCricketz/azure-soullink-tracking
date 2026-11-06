import assert from 'node:assert/strict'
import { test } from 'node:test'
import { asDead, partnerNeedsDeath, placeRow, withStatus } from '../src/lib/edits.ts'
import type { Catch, PlayerId, Status } from '../src/lib/types.ts'

function row(partial: Partial<Catch> & { id: string; player: PlayerId; route: string }): Catch {
  return {
    run_id: 'run',
    route_order: 1,
    pokemon: 'Patrat',
    dex_id: 504,
    form: null,
    nickname: null,
    status: 'alive',
    in_team: false,
    team_order: null,
    level: 8,
    note: null,
    death_cause: null,
    epitaph: null,
    died_at: null,
    created_at: '2026-11-01T00:00:00.000Z',
    updated_at: '2026-11-01T00:00:00.000Z',
    ...partial,
  }
}

function team(count: number, player: PlayerId = 'fisi'): Catch[] {
  return Array.from({ length: count }, (_, index) => row({
    id: `team-${index}`,
    player,
    route: `route-${index + 1}`,
    pokemon: `Mon ${index}`,
    in_team: true,
    team_order: index + 1,
    status: 'alive',
  }))
}

test('the team stops at six', () => {
  const six = team(6)
  const seventh = row({ id: 'seventh', player: 'fisi', route: 'route-7', pokemon: 'Lillipup' })
  assert.equal(placeRow(seventh, 'team', six), 'full')
  const five = team(5)
  const joined = placeRow(seventh, 'team', five)
  assert.notEqual(joined, 'full')
  if (joined === 'full') return
  assert.equal(joined.status, 'alive')
  assert.equal(joined.in_team, true)
  assert.equal(joined.team_order, 6)
  const already = six[0]
  assert.ok(already)
  const staying = placeRow(already, 'team', six)
  assert.notEqual(staying, 'full')
})

test('Box and Dead leave the team', () => {
  const member = row({ id: 'member', player: 'seri', route: 'route-2', in_team: true, team_order: 2, status: 'alive' })
  const boxed = placeRow(member, 'box', [member])
  assert.notEqual(boxed, 'full')
  if (boxed === 'full') return
  assert.equal(boxed.status, 'boxed')
  assert.equal(boxed.in_team, false)
  assert.equal(boxed.team_order, null)
  assert.equal(boxed.died_at, null)
  const dead = withStatus(member, 'dead')
  assert.equal(dead.status, 'dead')
  assert.equal(dead.in_team, false)
  assert.equal(dead.team_order, null)
  assert.ok(dead.died_at)
  const grave = asDead(member, 'a wild trainer')
  assert.equal(grave.status, 'dead')
  assert.equal(grave.death_cause, 'a wild trainer')
  assert.equal(grave.in_team, false)
})

test('a partner on the same route needs the faint confirmed', () => {
  const mine = row({ id: 'mine', player: 'fisi', route: 'route-1', status: 'dead' })
  const partner = row({ id: 'partner', player: 'seri', route: 'route-1', status: 'alive', pokemon: 'Sentret' })
  assert.equal(partnerNeedsDeath(mine, [mine, partner])?.id, 'partner')
  const missed: Status = 'missed'
  assert.equal(partnerNeedsDeath(mine, [mine, { ...partner, status: 'dead' }]), null)
  assert.equal(partnerNeedsDeath(mine, [mine, { ...partner, status: missed }]), null)
  assert.equal(partnerNeedsDeath(mine, [mine, { ...partner, route: 'route-2' }]), null)
  assert.equal(partnerNeedsDeath(mine, [mine]), null)
})

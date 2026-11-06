import assert from 'node:assert/strict'
import { test } from 'node:test'
import { backupPayload } from '../src/lib/backup.ts'
import type { Catch, Run } from '../src/lib/types.ts'

test('a backup is the run and both players, with no secrets', () => {
  const run = {
    id: 'run-1',
    name: 'Borrius',
    rules: 'Standard',
    active: true,
    badges: 2,
    level_cap: 25,
    options: { difficulty: 'vanilla', email: 'fisi@soullink.app', token: 'nope' },
    created_at: '2026-11-01T00:00:00.000Z',
    updated_at: '2026-11-06T00:00:00.000Z',
  } satisfies Run
  const catches = [
    { id: 'a', player: 'fisi', route: 'route-1', pokemon: 'Patrat' },
    { id: 'b', player: 'seri', route: 'route-1', pokemon: 'Sentret', password: 'hidden' },
  ] as unknown as Catch[]
  const file = backupPayload(run, catches, new Date('2026-11-06T12:00:00.000Z'))
  assert.equal(file.kind, 'soullink-backup')
  assert.equal(file.run?.name, 'Borrius')
  assert.equal(file.catches.length, 2)
  assert.deepEqual(file.catches.map((row) => row.player).sort(), ['fisi', 'seri'])
  const text = JSON.stringify(file)
  assert.equal(text.includes('fisi@soullink.app'), false)
  assert.equal(text.includes('nope'), false)
  assert.equal(text.includes('hidden'), false)
  assert.equal(text.includes('token'), false)
  assert.equal(text.includes('password'), false)
  assert.equal(text.includes('email'), false)
})

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { runStory, type StoryCatch } from '../src/lib/run-story.ts'

function row(partial: Partial<StoryCatch> & Pick<StoryCatch, 'player' | 'route' | 'status'>): StoryCatch {
  return {
    pokemon: 'Patrat',
    nickname: null,
    death_cause: null,
    created_at: '2026-11-01T00:00:00.000Z',
    died_at: null,
    ...partial,
  }
}

test('deaths are counted by player, route, and cause, in time order', () => {
  const story = runStory([
    row({ player: 'fisi', route: 'route-1', status: 'dead', pokemon: 'Patrat', nickname: 'Scout', death_cause: 'a wild Poochyena', created_at: '2026-11-01T01:00:00.000Z', died_at: '2026-11-02T01:00:00.000Z' }),
    row({ player: 'seri', route: 'route-1', status: 'dead', pokemon: 'Sentret', death_cause: 'a wild Poochyena', created_at: '2026-11-01T02:00:00.000Z', died_at: '2026-11-02T02:00:00.000Z' }),
    row({ player: 'fisi', route: 'route-2', status: 'alive', pokemon: 'Lillipup', created_at: '2026-11-03T00:00:00.000Z' }),
    row({ player: 'seri', route: 'route-4', status: 'missed', pokemon: null }),
  ])
  assert.deepEqual(story.deathsByPlayer, { fisi: 1, seri: 1 })
  assert.equal(story.deathsByRoute[0]?.route, 'route-1')
  assert.equal(story.deathsByRoute[0]?.count, 2)
  assert.equal(story.causes[0]?.cause, 'a wild Poochyena')
  assert.equal(story.causes[0]?.count, 2)
  assert.deepEqual(story.timeline.map((event) => `${event.kind}:${event.name}`), [
    'catch:Scout',
    'catch:Sentret',
    'death:Scout',
    'death:Sentret',
    'catch:Lillipup',
  ])
})

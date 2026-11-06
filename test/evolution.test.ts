import assert from 'node:assert/strict'
import { test } from 'node:test'
import { evolvedSpecies, evolutionProposals, isPreEvolution } from '../src/lib/evolution.ts'

test('the same personality and OT with a new species is an evolution, and death stays', () => {
  const proposals = evolutionProposals(
    [
      { identity: 'aabbccdd:00010002', name: 'Grotle', nat: 388, form: null },
      { identity: '11223344:00010002', name: 'Patrat', nat: 504, form: null },
    ],
    [
      { identity: 'aabbccdd:00010002', catchId: 'catch-1' },
      { identity: '11223344:00010002', catchId: 'catch-2' },
    ],
    [
      { id: 'catch-1', pokemon: 'Turtwig', dex_id: 387 },
      { id: 'catch-2', pokemon: 'Patrat', dex_id: 504 },
    ],
  )
  assert.equal(proposals.length, 1)
  assert.equal(proposals[0]?.fromName, 'Turtwig')
  assert.equal(proposals[0]?.toName, 'Grotle')
  assert.equal(proposals[0]?.toDex, 388)
  const logged = {
    pokemon: 'Turtwig',
    dex_id: 387,
    form: null,
    status: 'dead' as const,
    in_team: false,
    death_cause: 'a wild trainer',
    epitaph: 'Gone',
    died_at: '2026-11-01T00:00:00.000Z',
  }
  const next = evolvedSpecies(logged, proposals[0])
  assert.equal(next.pokemon, 'Grotle')
  assert.equal(next.dex_id, 388)
  assert.equal(next.status, 'dead')
  assert.equal(next.death_cause, 'a wild trainer')
  assert.equal(next.epitaph, 'Gone')
  assert.equal(next.died_at, logged.died_at)
  assert.equal(next.in_team, false)
  assert.equal(proposals[0]?.confidence, 'identity')
})

test('the same route and a pre-evolution is a likely fallback without a saved identity', () => {
  assert.equal(isPreEvolution('Turtwig', 'Grotle'), true)
  assert.equal(isPreEvolution('Bulbasaur', 'Venusaur'), true)
  assert.equal(isPreEvolution('Charmander', 'Venusaur'), false)
  const likely = evolutionProposals(
    [{ identity: 'new-save', name: 'Grotle', nat: 388, form: null, route: 'route-2' }],
    [],
    [{ id: 'catch-1', player: 'fisi', route: 'route-2', pokemon: 'Turtwig', dex_id: 387 }],
    'fisi',
  )
  assert.equal(likely.length, 1)
  assert.equal(likely[0]?.confidence, 'likely')
  assert.equal(likely[0]?.fromName, 'Turtwig')
  assert.equal(evolutionProposals(
    [{ identity: 'new-save', name: 'Grotle', nat: 388, form: null, route: 'route-3' }],
    [],
    [{ id: 'catch-1', player: 'fisi', route: 'route-2', pokemon: 'Turtwig', dex_id: 387 }],
    'fisi',
  ).length, 0)
  assert.equal(evolutionProposals(
    [{ identity: 'new-save', name: 'Grotle', nat: 388, form: null, route: 'route-2' }],
    [],
    [{ id: 'catch-1', player: 'seri', route: 'route-2', pokemon: 'Turtwig', dex_id: 387 }],
    'fisi',
  ).length, 0)
})

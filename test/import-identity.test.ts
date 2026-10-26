/**
 * A Pokémon is its personality plus OT id. Box and slot are not identity.
 * Species 0 leftovers are not that Pokémon and are not a new one.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { confirmAllIds, planSave, type RouteOption } from '../src/lib/save/plan.ts'
import { diffSaves, identityOf } from '../src/lib/save/save-diff.ts'
import { boxMon, boxRemnant, boxSlot, buildSave } from '../src/lib/save/synthetic.ts'
import { parseSave, type SpeciesTable } from '../src/lib/save/unbound-save.ts'

const here = dirname(fileURLToPath(import.meta.url))
const table: SpeciesTable = JSON.parse(readFileSync(join(here, '../src/data/unbound/species-table.json'), 'utf8'))
const dex = JSON.parse(readFileSync(join(here, '../src/data/unbound/dex.json'), 'utf8'))
const routes: RouteOption[] = [
  { name: 'route-1', en: 'Route 1', order: 2, group: 'Opening' },
  { name: 'route-2', en: 'Route 2', order: 5, group: 'Opening' },
]

const OLD_PID = 0x11110001
const OTHER_PID = 0x22220002
const NEW_PID = 0x33330003

function save(mutate: Parameters<typeof buildSave>[0]['mutate']): ReturnType<typeof parseSave> {
  return parseSave(buildSave({ indexA: 4, indexB: 1, mutate }), { table, dexNames: dex })
}

function place(box: number, slot: number, species: number, pid: number, location: number) {
  return (sectors: Parameters<NonNullable<Parameters<typeof buildSave>[0]['mutate']>>[0]) => {
    boxMon(sectors, boxSlot(box, slot), null, 0, species, 1000, pid, { location, level: 8 })
  }
}

function plan(parsed: ReturnType<typeof parseSave>, previousIds: string[]) {
  const catches = [{ player: 'fisi' as const, dex_id: 1, status: 'alive', pokemon: 'Bulbasaur', route: 'route-1' }]
  const frozen = JSON.parse(JSON.stringify(catches))
  const result = planSave(parsed, {
    me: 'fisi',
    catches,
    previousNats: [1],
    previousIds,
    randomizerSpecies: true,
    routes,
    areas: [{ key: 'route-1', species: ['Bulbasaur'] }, { key: 'route-2', species: ['Goldeen'] }],
  })
  assert.deepEqual(catches, frozen)
  return result
}

describe('import identity is personality plus OT, never a box slot', () => {
  test('a known Pokémon moved from box 1 to box 14 is not a new suggestion and the log is untouched', () => {
    const before = save(place(0, 0, 1, OLD_PID, 101))
    const identity = identityOf(before.boxes[0].mons[0])
    assert.equal(before.boxes[0].mons[0].box, 0)
    const after = save(place(13, 0, 1, OLD_PID, 101))
    assert.equal(after.boxes[13].mons[0].slot, 0)
    assert.equal(identityOf(after.boxes[13].mons[0]), identity)
    const diff = diffSaves(before, after)
    assert.deepEqual(diff.added, [])
    assert.deepEqual(diff.removed, [])
    const next = plan(after, [identity])
    assert.equal(next.suggestions.length, 0)
    assert.equal(next.missing.length, 0)
    assert.deepEqual(confirmAllIds(next.mons, {}, new Map()), [])
  })

  test('a known Pokémon replaced by species 0 leftovers is only a dead/gone suggestion', () => {
    const before = save(place(0, 0, 1, OLD_PID, 101))
    const identity = identityOf(before.boxes[0].mons[0])
    const after = save((sectors) => boxRemnant(sectors, boxSlot(0, 0), OLD_PID))
    assert.equal(after.boxes.flatMap((box) => box.mons).length, 0)
    assert.deepEqual(after.releasedRemnants, [{ box: 0, slot: 0 }])
    assert.deepEqual(after.ownedSpeciesNat, [])
    assert.equal(after.warnings.some((warning) => warning.includes('Species')), false)
    const diff = diffSaves(before, after)
    assert.equal(diff.added.length, 0)
    assert.equal(diff.removed.length, 1)
    assert.equal(diff.removed[0].identity, identity)
    const next = plan(after, [identity])
    assert.equal(next.suggestions.length, 0)
    assert.deepEqual(next.missing, [{ identity, prompt: 'Dead/gone?' }])
    assert.deepEqual(confirmAllIds(next.mons, { [next.mons[0]?.id ?? '']: 'route-1' }, new Map()), [])
  })

  test('a new Pokémon beside a species 0 remnant is new and is not the old entry', () => {
    const before = save(place(0, 0, 1, OLD_PID, 101))
    const oldId = identityOf(before.boxes[0].mons[0])
    const after = save((sectors) => {
      boxRemnant(sectors, boxSlot(0, 0), OLD_PID)
      boxMon(sectors, boxSlot(0, 1), null, 0, 118, 8000, NEW_PID, { location: 102, level: 8 })
    })
    assert.equal(after.releasedRemnants.length, 1)
    assert.equal(after.boxes[0].mons.length, 1)
    assert.equal(after.boxes[0].mons[0].speciesId, 118)
    assert.notEqual(identityOf(after.boxes[0].mons[0]), oldId)
    assert.deepEqual(after.ownedSpeciesNat, [118])
    const next = plan(after, [oldId])
    assert.deepEqual(next.suggestions.map((mon) => mon.identity), [identityOf(after.boxes[0].mons[0])])
    assert.deepEqual(next.missing, [{ identity: oldId, prompt: 'Dead/gone?' }])
    assert.equal(next.suggestions[0].place, 'route')
    assert.equal(next.suggestions[0].suggestedRoute, 'route-2')
    const chosen = { [next.suggestions[0].id]: 'route-2' }
    assert.deepEqual(confirmAllIds(next.suggestions, chosen, new Map([[next.suggestions[0].id, { duplicate: false, duplicateOf: null }]])), [next.suggestions[0].id])
    assert.equal(confirmAllIds(next.mons, chosen, new Map()).includes(oldId), false)
  })

  test('two Pokémon swapping places is not a change', () => {
    const before = save((sectors) => {
      boxMon(sectors, boxSlot(0, 0), null, 0, 1, 1000, OLD_PID, { location: 101, level: 8 })
      boxMon(sectors, boxSlot(0, 1), null, 0, 118, 8000, OTHER_PID, { location: 102, level: 8 })
    })
    const ids = before.boxes[0].mons.map((mon) => identityOf(mon))
    const after = save((sectors) => {
      boxMon(sectors, boxSlot(0, 1), null, 0, 1, 1000, OLD_PID, { location: 101, level: 8 })
      boxMon(sectors, boxSlot(0, 0), null, 0, 118, 8000, OTHER_PID, { location: 102, level: 8 })
    })
    const diff = diffSaves(before, after)
    assert.deepEqual(diff.added, [])
    assert.deepEqual(diff.removed, [])
    assert.equal(diff.moved.length, 2)
    const next = plan(after, ids)
    assert.equal(next.suggestions.length, 0)
    assert.equal(next.missing.length, 0)
    assert.deepEqual(confirmAllIds(next.mons, {}, new Map()), [])
  })

  test('importing the same save again suggests nothing new', () => {
    const parsed = save((sectors) => {
      boxMon(sectors, boxSlot(0, 0), null, 0, 1, 1000, OLD_PID, { location: 101, level: 8 })
      boxMon(sectors, boxSlot(0, 1), null, 0, 118, 8000, OTHER_PID, { location: 102, level: 8 })
    })
    const ids = parsed.boxes.flatMap((box) => box.mons).map((mon) => identityOf(mon))
    const next = plan(parsed, ids)
    assert.equal(next.suggestions.length, 0)
    assert.equal(next.missing.length, 0)
    assert.equal(next.mons.length, 2)
    assert.deepEqual(confirmAllIds(next.mons, Object.fromEntries(next.mons.map((mon) => [mon.id, mon.suggestedRoute ?? ''])), new Map()), [])
  })
})

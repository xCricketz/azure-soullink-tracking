import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { explainSaveError } from '../src/lib/save/explain.ts'
import { readImportedNats, writeImportedNats, type NatStore } from '../src/lib/save/memory.ts'
import { detectedImportIds, furthestRoute, planSave, routeClash, suggestRoute, type RouteOption } from '../src/lib/save/plan.ts'
import { parseSave, type SpeciesTable } from '../src/lib/save/unbound-save.ts'
import { sampleSave } from '../src/lib/save/synthetic.ts'

const here = dirname(fileURLToPath(import.meta.url))
const table: SpeciesTable = JSON.parse(readFileSync(join(here, '../src/data/unbound/species-table.json'), 'utf8'))
const dex = JSON.parse(readFileSync(join(here, '../src/data/unbound/dex.json'), 'utf8'))

const routes: RouteOption[] = [
  { name: 'route-1', en: 'Route 1', order: 2, group: 'Opening' },
  { name: 'route-6', en: 'Route 6', order: 18, group: 'Badge 2' },
]

describe('Import planning', () => {
  test('sample save is the demo file and stays synthetic', () => {
    const parsed = parseSave(sampleSave(), { table, dexNames: dex })
    assert.equal(parsed.trainer.name, 'Test')
    assert.equal(parsed.party[0]?.nat, 807)
    assert.equal(parsed.party[0]?.levelSource, 'stored')
    assert.equal(parsed.party[0]?.shiny, true)
    assert.equal(parsed.party[0]?.metLocation, 88)
    assert.equal(parsed.party[0]?.metLevel, 12)
    assert.deepEqual(parsed.boxes[0]?.mons.map((mon) => mon.nat), [118, 1])
    assert.equal(parsed.boxes[0]?.mons[0]?.metLocation, 90)
    assert.equal(parsed.boxes[0]?.mons[1]?.metLocation, 91)
    assert.equal(parsed.boxes[0]?.mons[1]?.ownOT, false)
    assert.equal(parsed.boxes[0]?.mons[0]?.levelSource, 'exp-derived')
    assert.equal(parsed.dex.caughtCount, 3)
  })

  test('matches by national number and does not use encounter lists when the randomizer is on', () => {
    const parsed = parseSave(sampleSave(), { table, dexNames: dex })
    const plan = planSave(parsed, {
      me: 'fisi',
      catches: [{ player: 'fisi', dex_id: 118, status: 'alive', pokemon: 'Goldeen', route: 'route-6' }],
      previousNats: [807],
      randomizerSpecies: true,
      routes,
      areas: [{ key: 'route-1', species: ['Zeraora', 'Bulbasaur', 'Goldeen'] }],
    })
    const byNat = new Map(plan.mons.map((mon) => [mon.nat, mon]))
    assert.equal(byNat.get(118)?.alreadyLogged, true)
    assert.equal(byNat.get(118)?.newSinceImport, true)
    assert.equal(byNat.get(807)?.alreadyLogged, false)
    assert.equal(byNat.get(807)?.newSinceImport, false)
    assert.equal(byNat.get(1)?.newSinceImport, true)
    assert.equal(byNat.get(807)?.nickname, '')
    assert.equal(byNat.get(118)?.nickname, 'Nick')
    assert.equal(byNat.get(807)?.place, 'needs-route')
    assert.equal(byNat.get(807)?.suggestedRoute, null)
    assert.equal(byNat.get(118)?.place, 'needs-route')
    assert.equal(byNat.get(1)?.place, 'trade')
    assert.deepEqual(detectedImportIds(plan.mons), [])
  })

  test('a mapped met location is preselected, and a second catch on that route is only marked', () => {
    const parsed = parseSave(sampleSave(), { table, dexNames: dex })
    const plan = planSave(parsed, {
      me: 'fisi',
      catches: [{ player: 'fisi', dex_id: null, status: 'alive', pokemon: 'Sentret', route: 'route-6' }],
      previousNats: [],
      randomizerSpecies: true,
      routes,
      areas: [],
      sections: {
        88: { route: 'route-1' },
        90: { route: 'route-6' },
        91: { route: 'route-1', kind: 'gift', label: 'Starter' },
        100: { routes: ['route-1', 'route-6'] },
      },
    })
    const byNat = new Map(plan.mons.map((mon) => [mon.nat, mon]))
    const zeraora = byNat.get(807)
    const goldeen = byNat.get(118)
    assert.equal(zeraora?.place, 'route')
    assert.equal(zeraora?.suggestedRoute, 'route-1')
    assert.equal(zeraora?.duplicate, false)
    assert.equal(goldeen?.place, 'route')
    assert.equal(goldeen?.suggestedRoute, 'route-6')
    assert.equal(goldeen?.duplicate, true)
    assert.equal(goldeen?.duplicateOf, 'Sentret')
    assert.equal(byNat.get(1)?.place, 'trade')
    assert.deepEqual(detectedImportIds(plan.mons), [zeraora?.id])

    const sameRoute = planSave(parsed, {
      me: 'fisi',
      catches: [],
      previousNats: [],
      randomizerSpecies: true,
      routes,
      areas: [],
      sections: { 88: { route: 'route-1' }, 90: { route: 'route-1' } },
    })
    const first = sameRoute.mons.find((mon) => mon.nat === 807)
    const second = sameRoute.mons.find((mon) => mon.nat === 118)
    assert.equal(first?.duplicate, false)
    assert.equal(second?.duplicate, true)
    assert.equal(second?.duplicateOf, 'Zeraora')
    assert.deepEqual(detectedImportIds(sameRoute.mons), [first?.id])
  })

  test('gifts, events, and ambiguous sections stay out of the automatic import', () => {
    const parsed = parseSave(sampleSave(), { table, dexNames: dex })
    parsed.party[0].metLocation = 100
    parsed.boxes[0].mons[0].metLocation = 200
    parsed.boxes[0].mons[0].ownOT = true
    parsed.boxes[0].mons[1].ownOT = true
    parsed.boxes[0].mons[1].metLocation = 201
    const plan = planSave(parsed, {
      me: 'fisi',
      catches: [],
      previousNats: [],
      randomizerSpecies: true,
      routes,
      areas: [],
      sections: {
        100: { routes: ['route-1', 'route-6'] },
        200: { kind: 'gift', label: 'Fossil', route: 'route-1' },
        201: { kind: 'event', label: 'Wonder Card' },
      },
    })
    const byNat = new Map(plan.mons.map((mon) => [mon.nat, mon]))
    assert.equal(byNat.get(807)?.place, 'needs-route')
    assert.deepEqual(byNat.get(807)?.ambiguous, ['route-1', 'route-6'])
    assert.equal(byNat.get(118)?.place, 'gift')
    assert.equal(byNat.get(118)?.suggestedRoute, 'route-1')
    assert.equal(byNat.get(1)?.place, 'event')
    assert.deepEqual(detectedImportIds(plan.mons), [])
  })

  test('area names can suggest a route only while the randomizer is off', () => {
    const progress = furthestRoute(routes, [{ route: 'route-6', status: 'alive', pokemon: 'Goldeen' }])
    assert.equal(progress, 'route-6')
    const off = suggestRoute('Zeraora', progress, routes, [{ key: 'route-1', species: ['Zeraora'] }], false)
    assert.deepEqual(off, { route: 'route-1', suggestion: 'area' })
    const on = suggestRoute('Zeraora', progress, routes, [{ key: 'route-1', species: ['Zeraora'] }], true)
    assert.deepEqual(on, { route: 'route-6', suggestion: 'progress' })
    const hinted = planSave(parseSave(sampleSave(), { table, dexNames: dex }), {
      me: 'fisi',
      catches: [{ player: 'fisi', dex_id: null, status: 'alive', pokemon: 'Goldeen', route: 'route-6' }],
      previousNats: [],
      randomizerSpecies: false,
      routes,
      areas: [{ key: 'route-1', species: ['Zeraora'] }],
    })
    const hintedMon = hinted.mons.find((mon) => mon.nat === 807)
    assert.equal(hintedMon?.place, 'needs-route')
    assert.equal(hintedMon?.suggestion, 'area')
    assert.equal(hintedMon?.suggestedRoute, 'route-1')
    assert.deepEqual(detectedImportIds(hinted.mons), [])
  })

  test('two Pokémon on one route are a clash', () => {
    assert.equal(routeClash(['a', 'b'], { a: 'route-1', b: 'route-1' }), true)
    assert.equal(routeClash(['a', 'b'], { a: 'route-1', b: 'route-6' }), false)
  })

  test('english errors for size and checksum', () => {
    assert.equal(explainSaveError(new Error('unerwartete Dateigröße 1000')), 'That file is the wrong size. Unbound saves are 128 KB.')
    assert.equal(
      explainSaveError(new Error('kein gültiger Slot: Sektor-ID 0: Checksumme')),
      'The save failed its checksum. Save in the game, then export the .sav again. A save state is not enough.',
    )
    assert.throws(() => parseSave(new Uint8Array(1000), { table }))
  })

  test('last-import set is per run on the given store', () => {
    const bag = new Map<string, string>()
    const storage: NatStore = {
      getItem: (key) => bag.get(key) ?? null,
      setItem: (key, value) => { bag.set(key, value) },
    }
    assert.deepEqual(readImportedNats('demo-run', storage), [])
    writeImportedNats('demo-run', [807, 1, 807], storage)
    assert.deepEqual(readImportedNats('demo-run', storage), [1, 807])
    assert.deepEqual(readImportedNats('other-run', storage), [])
  })
})

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { explainSaveError, formatPlaytime, versionProblem } from '../src/lib/save/explain.ts'
import { readImportedNats, writeImportedNats, type NatStore } from '../src/lib/save/memory.ts'
import { confirmAllIds, detectedImportIds, furthestRoute, liveDecisions, planSave, routeClash, suggestRoute, type RouteOption } from '../src/lib/save/plan.ts'
import { buildMetInfo, parseSave, type SpeciesTable } from '../src/lib/save/unbound-save.ts'
import { boxMon, buildSave, sampleSave } from '../src/lib/save/synthetic.ts'

const here = dirname(fileURLToPath(import.meta.url))
const table: SpeciesTable = JSON.parse(readFileSync(join(here, '../src/data/unbound/species-table.json'), 'utf8'))
const dex = JSON.parse(readFileSync(join(here, '../src/data/unbound/dex.json'), 'utf8'))

const routes: RouteOption[] = [
  { name: 'route-1', en: 'Route 1', order: 2, group: 'Opening' },
  { name: 'route-6', en: 'Route 6', order: 18, group: 'Badge 2' },
  { name: 'route-9', en: 'Route 9', order: 40, group: 'Badge 4' },
  { name: 'cube-corp', en: 'Cube Corp.', order: 73, group: 'Side areas' },
  { name: 'redwood-village', en: 'Redwood Village', order: 60, group: 'Side areas' },
]

describe('Import planning', () => {
  test('sample save is the demo file and stays synthetic', () => {
    const parsed = parseSave(sampleSave(), { table, dexNames: dex })
    assert.equal(parsed.trainer.name, 'Test')
    assert.equal(formatPlaytime(parsed.trainer.playtime), '12:34:56')
    assert.equal(parsed.party[0]?.nat, 807)
    assert.equal(parsed.party[0]?.levelSource, 'stored')
    assert.equal(parsed.party[0]?.shiny, true)
    assert.equal(parsed.party[0]?.met.mapSectionId, 109)
    assert.equal(parsed.party[0]?.met.catchLevel, 12)
    assert.equal(parsed.party[0]?.met.category, 'area')
    assert.equal(parsed.party[0]?.met.ballName, 'Poké')
    assert.equal(parsed.party[0]?.met.originsWord, 12 | (4 << 7))
    assert.deepEqual(parsed.boxes[0]?.mons.map((mon) => mon.nat), [118, 1])
    assert.equal(parsed.boxes[0]?.mons[0]?.met.mapSectionId, 101)
    assert.equal(parsed.boxes[0]?.mons[0]?.met.catchLevel, 8)
    assert.equal(parsed.boxes[0]?.mons[1]?.met.mapSectionId, 254)
    assert.equal(parsed.boxes[0]?.mons[1]?.met.category, 'in-game-trade')
    assert.equal(parsed.boxes[0]?.mons[1]?.ownOT, false)
    assert.equal(parsed.boxes[0]?.mons[0]?.levelSource, 'exp-derived')
    assert.equal(parsed.dex.caughtCount, 3)
  })

  test('a national number is not an identity, and the randomizer does not use encounter lists', () => {
    const parsed = parseSave(sampleSave(), { table, dexNames: dex })
    parsed.party[0].met = buildMetInfo(128, 12 | (4 << 7), 3)
    parsed.boxes[0].mons[0].met = buildMetInfo(128, 8 | (4 << 7), 3)
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
    assert.equal(byNat.get(807)?.newSinceImport, true)
    assert.equal(byNat.get(1)?.newSinceImport, true)
    const samePokemon = planSave(parsed, {
      me: 'fisi',
      catches: [{ player: 'fisi', dex_id: 118, status: 'alive', pokemon: 'Goldeen', route: 'route-6' }],
      previousNats: [807],
      previousIds: [byNat.get(807)?.identity ?? ''],
      randomizerSpecies: true,
      routes,
      areas: [{ key: 'route-1', species: ['Zeraora', 'Bulbasaur', 'Goldeen'] }],
    })
    assert.equal(samePokemon.mons.find((mon) => mon.nat === 807)?.newSinceImport, false)
    assert.equal(samePokemon.suggestions.some((mon) => mon.nat === 807), false)
    assert.equal(byNat.get(807)?.nickname, '')
    assert.equal(byNat.get(118)?.nickname, 'Nick')
    assert.equal(byNat.get(807)?.place, 'needs-decision')
    assert.equal(byNat.get(807)?.decision, 'unmapped')
    assert.equal(byNat.get(807)?.suggestedRoute, null)
    assert.equal(byNat.get(118)?.place, 'needs-decision')
    assert.equal(byNat.get(118)?.suggestedRoute, null)
    assert.equal(byNat.get(1)?.decision, 'trade')
    assert.deepEqual(detectedImportIds(plan.mons), [])
  })

  test('a mapped met location is preselected, and a second catch on that route is only marked', () => {
    const parsed = parseSave(sampleSave(), { table, dexNames: dex })
    const plan = planSave(parsed, {
      me: 'fisi',
      catches: [{ player: 'fisi', dex_id: null, status: 'alive', pokemon: 'Sentret', route: 'route-1' }],
      previousNats: [],
      randomizerSpecies: true,
      routes,
      areas: [],
    })
    const byNat = new Map(plan.mons.map((mon) => [mon.nat, mon]))
    const zeraora = byNat.get(807)
    const goldeen = byNat.get(118)
    assert.equal(zeraora?.place, 'route')
    assert.equal(zeraora?.suggestedRoute, 'route-9')
    assert.equal(zeraora?.confidence, 'verified')
    assert.equal(zeraora?.duplicate, false)
    assert.equal(goldeen?.place, 'route')
    assert.equal(goldeen?.suggestedRoute, 'route-1')
    assert.equal(goldeen?.confidence, 'likely')
    assert.equal(goldeen?.duplicate, true)
    assert.equal(goldeen?.duplicateOf, 'Sentret')
    assert.equal(byNat.get(1)?.place, 'needs-decision')
    assert.equal(byNat.get(1)?.decision, 'trade')
    assert.deepEqual(detectedImportIds(plan.mons), [zeraora?.id])

    parsed.boxes[0].mons[0].met = { ...parsed.party[0].met }
    const sameRoute = planSave(parsed, {
      me: 'fisi',
      catches: [],
      previousNats: [],
      randomizerSpecies: true,
      routes,
      areas: [],
    })
    const first = sameRoute.mons.find((mon) => mon.nat === 807)
    const second = sameRoute.mons.find((mon) => mon.nat === 118)
    assert.equal(first?.duplicate, false)
    assert.equal(second?.duplicate, true)
    assert.equal(second?.duplicateOf, 'Zeraora')
    assert.deepEqual(detectedImportIds(sameRoute.mons), [first?.id])
  })

  test('gifts, events, hatches, and guesses stay out of confirm all unless they are a wild catch', () => {
    const parsed = parseSave(sampleSave(), { table, dexNames: dex })
    parsed.party[0].met = buildMetInfo(109, 12 | (4 << 7), 15)
    parsed.boxes[0].mons[0].met = buildMetInfo(255, 50 | (4 << 7), 15)
    parsed.boxes[0].mons[0].ownOT = true
    parsed.boxes[0].mons[1].ownOT = true
    parsed.boxes[0].mons[1].met = buildMetInfo(146, 4 << 7, 3)
    const plan = planSave(parsed, {
      me: 'fisi',
      catches: [],
      previousNats: [],
      randomizerSpecies: true,
      routes,
      areas: [],
    })
    const byNat = new Map(plan.mons.map((mon) => [mon.nat, mon]))
    assert.equal(byNat.get(807)?.decision, 'gift')
    assert.equal(byNat.get(807)?.suggestedRoute, 'gift-route-9')
    assert.equal(byNat.get(807)?.confidence, 'guess')
    assert.equal(byNat.get(118)?.decision, 'event')
    assert.equal(byNat.get(1)?.decision, 'hatched')
    assert.equal(byNat.get(1)?.suggestedRoute, 'redwood-village')
    assert.equal(byNat.get(1)?.confidence, 'likely')
    assert.deepEqual(detectedImportIds(plan.mons), [])

    parsed.party[0].met = buildMetInfo(125, 20 | (4 << 7), 3)
    const guessed = planSave(parsed, {
      me: 'fisi',
      catches: [],
      previousNats: [],
      randomizerSpecies: true,
      routes,
      areas: [],
    })
    const guess = guessed.mons.find((mon) => mon.nat === 807)
    assert.equal(guess?.place, 'route')
    assert.equal(guess?.confidence, 'guess')
    assert.equal(guess?.suggestedRoute, 'cube-corp')
    assert.deepEqual(detectedImportIds(guessed.mons), [guess?.id])
  })

  test('area names can suggest a route only while the randomizer is off', () => {
    const progress = furthestRoute(routes, [{ route: 'route-6', status: 'alive', pokemon: 'Goldeen' }])
    assert.equal(progress, 'route-6')
    const off = suggestRoute('Zeraora', progress, routes, [{ key: 'route-1', species: ['Zeraora'] }], false)
    assert.deepEqual(off, { route: 'route-1', suggestion: 'area' })
    const on = suggestRoute('Zeraora', progress, routes, [{ key: 'route-1', species: ['Zeraora'] }], true)
    assert.deepEqual(on, { route: 'route-6', suggestion: 'progress' })
    const hintedSave = parseSave(sampleSave(), { table, dexNames: dex })
    hintedSave.party[0].met = buildMetInfo(128, 12 | (4 << 7), 3)
    hintedSave.boxes[0].mons[0].met = buildMetInfo(128, 8 | (4 << 7), 3)
    const hinted = planSave(hintedSave, {
      me: 'fisi',
      catches: [{ player: 'fisi', dex_id: null, status: 'alive', pokemon: 'Goldeen', route: 'route-6' }],
      previousNats: [],
      randomizerSpecies: false,
      routes,
      areas: [{ key: 'route-1', species: ['Zeraora'] }],
    })
    const hintedMon = hinted.mons.find((mon) => mon.nat === 807)
    assert.equal(hintedMon?.place, 'needs-decision')
    assert.equal(hintedMon?.decision, 'unmapped')
    assert.equal(hintedMon?.suggestion, 'area')
    assert.equal(hintedMon?.suggestedRoute, 'route-1')
    assert.deepEqual(detectedImportIds(hinted.mons), [])
  })

  test('a chosen route stays a suggestion, and only the first catch can be confirmed', () => {
    const parsed = parseSave(sampleSave(), { table, dexNames: dex })
    const logged = [{ player: 'fisi' as const, route: 'route-6', pokemon: 'Sentret', status: 'alive' }]
    const plan = planSave(parsed, {
      me: 'fisi',
      catches: [{ ...logged[0], dex_id: null }],
      previousNats: [],
      randomizerSpecies: true,
      routes,
      areas: [],
    })
    const zeraora = plan.mons.find((mon) => mon.nat === 807)!
    const goldeen = plan.mons.find((mon) => mon.nat === 118)!
    const bulbasaur = plan.mons.find((mon) => mon.nat === 1)!
    const suggested = {
      [zeraora.id]: 'route-1',
      [goldeen.id]: 'route-6',
      [bulbasaur.id]: 'route-1',
    }
    const asSuggested = liveDecisions(plan.mons, suggested, logged, 'fisi')
    assert.equal(asSuggested.get(zeraora.id)?.duplicate, false)
    assert.equal(asSuggested.get(goldeen.id)?.duplicate, true)
    assert.equal(asSuggested.get(goldeen.id)?.duplicateOf, 'Sentret')
    assert.equal(asSuggested.get(bulbasaur.id)?.duplicate, true)
    assert.equal(asSuggested.get(bulbasaur.id)?.duplicateOf, 'Zeraora')
    assert.deepEqual(confirmAllIds(plan.mons, suggested, asSuggested), [zeraora.id])

    const freed = { ...suggested, [goldeen.id]: 'cube-corp', [bulbasaur.id]: '' }
    const changed = liveDecisions(plan.mons, freed, logged, 'fisi')
    assert.equal(changed.get(goldeen.id)?.duplicate, false)
    assert.equal(changed.get(bulbasaur.id)?.duplicate, false)
    assert.deepEqual(confirmAllIds(plan.mons, freed, changed), [zeraora.id, goldeen.id])

    const cleared = { ...freed, [zeraora.id]: '' }
    const emptyClaimsNothing = liveDecisions(plan.mons, cleared, logged, 'fisi')
    assert.equal(emptyClaimsNothing.get(zeraora.id)?.duplicate, false)
    assert.deepEqual(confirmAllIds(plan.mons, cleared, emptyClaimsNothing), [goldeen.id])

    const after = { [zeraora.id]: 'route-1', [goldeen.id]: 'route-1', [bulbasaur.id]: '' }
    const blocked = liveDecisions(plan.mons, after, logged, 'fisi', [zeraora.id])
    assert.equal(blocked.get(zeraora.id)?.duplicate, false)
    assert.equal(blocked.get(goldeen.id)?.duplicate, true)
    assert.equal(blocked.get(goldeen.id)?.duplicateOf, 'Zeraora')
    assert.deepEqual(confirmAllIds(plan.mons, after, blocked, [zeraora.id]), [])
  })

  test('two Pokémon on one route are a clash', () => {
    assert.equal(routeClash(['a', 'b'], { a: 'route-1', b: 'route-1' }), true)
    assert.equal(routeClash(['a', 'b'], { a: 'route-1', b: 'route-6' }), false)
  })

  test('english errors for size, both slots, and a non-Unbound signature', () => {
    assert.equal(
      explainSaveError(new Error('unerwartete Dateigröße 1000')),
      'That file is the wrong size. A Pokémon Unbound save is 128 KB. Sixteen extra bytes at the start or the end are ok.',
    )
    assert.equal(
      explainSaveError(new Error('kein gültiger Slot: Sektor-ID 0: Checksumme')),
      'Both save slots are broken. Save in the game, then export the .sav again. A save state is not enough.',
    )
    assert.throws(() => parseSave(new Uint8Array(1000), { table }))
    const broken = buildSave({ indexA: 4, indexB: 3 })
    broken[0x100] ^= 0xff
    broken[0xe000 + 0x100] ^= 0xff
    assert.throws(() => parseSave(broken, { table }), /kein gültiger Slot/)

    const foreign = buildSave({ indexA: 4, indexB: 2 })
    const view = new DataView(foreign.buffer)
    for (let slot = 0; slot < 2; slot++) {
      for (let sector = 0; sector < 14; sector++) view.setUint32(slot * 0xe000 + sector * 0x1000 + 0xff8, 0x08012025, true)
    }
    const parsed = parseSave(foreign, { table })
    assert.equal(parsed.activeSlot, 0)
    assert.equal(versionProblem(parsed), 'This does not look like a Pokémon Unbound (FireRed) save.')
    assert.equal(formatPlaytime({ hours: 0, minutes: 0, seconds: 0, frames: 0 }), null)
  })

  test('a form is the base species, and the second one on a route is a duplicate', () => {
    const sav = buildSave({
      indexA: 6,
      indexB: 1,
      mutate: (sectors) => {
        boxMon(sectors, { id: 5, o: 4 }, null, 0, 3, 1000, 11, { location: 109, level: 20 })
        boxMon(sectors, { id: 5, o: 4 + 58 }, null, 0, 869, 1000, 12, { location: 109, level: 20 })
        boxMon(sectors, { id: 5, o: 4 + 116 }, null, 0, 6, 1000, 13, { location: 101, level: 8 })
      },
    })
    const parsed = parseSave(sav, { table, dexNames: dex })
    assert.equal(parsed.activeSlot, 0)
    const plan = planSave(parsed, {
      me: 'fisi',
      catches: [],
      previousNats: [],
      randomizerSpecies: true,
      routes,
      areas: [],
    })
    const venusaur = plan.mons.filter((mon) => mon.nat === 3)
    assert.equal(venusaur.length, 2)
    assert.equal(venusaur[0].formIndex, 0)
    assert.equal(venusaur[0].formNote, null)
    assert.equal(venusaur[0].duplicate, false)
    assert.equal(venusaur[0].suggestedRoute, 'route-9')
    assert.equal(venusaur[1].formIndex, 1)
    assert.match(venusaur[1].formNote ?? '', /base species/)
    assert.equal(venusaur[1].duplicate, true)
    assert.equal(venusaur[1].duplicateOf, venusaur[0].name)
    const other = plan.mons.find((mon) => mon.nat === 6)
    assert.equal(other?.duplicate, false)
    assert.equal(other?.suggestedRoute, 'route-1')
    assert.equal(other?.newSinceImport, true)
    const again = planSave(parsed, {
      me: 'fisi',
      catches: [],
      previousNats: [3, 6],
      previousIds: plan.mons.map((mon) => mon.identity),
      randomizerSpecies: true,
      routes,
      areas: [],
    })
    assert.equal(again.mons.every((mon) => mon.newSinceImport === false), true)
    assert.equal(again.suggestions.length, 0)
    assert.equal(again.missing.length, 0)
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

/**
 * Synthetic Unbound saves in save-import/fixtures-synthetic/.
 * Invented bytes only. Expected JSON is the generator's model, not this parser.
 */
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { UNKNOWN_SPECIES, planSave, type RouteOption } from '../src/lib/save/plan.ts'
import { allMons, diffSaves, identityOf } from '../src/lib/save/save-diff.ts'
import { parseSave, type Mon, type ParsedSave, type SpeciesTable } from '../src/lib/save/unbound-save.ts'

const here = dirname(fileURLToPath(import.meta.url))
const fixtureDir = join(here, '../save-import/fixtures-synthetic')
const table: SpeciesTable = JSON.parse(readFileSync(join(here, '../src/data/unbound/species-table.json'), 'utf8'))
const dex = JSON.parse(readFileSync(join(here, '../src/data/unbound/dex.json'), 'utf8'))
const sections = JSON.parse(readFileSync(join(here, '../src/data/unbound/mapsec-to-route.json'), 'utf8')) as Record<string, { route_id: string | null }>

const names = readdirSync(fixtureDir).filter((file) => file.endsWith('.sav')).map((file) => file.slice(0, -4)).sort()

function expected(name: string): Record<string, any> {
  return JSON.parse(readFileSync(join(fixtureDir, `${name}.expected.json`), 'utf8'))
}

function parse(name: string): ParsedSave {
  return parseSave(new Uint8Array(readFileSync(join(fixtureDir, `${name}.sav`))), { table, dexNames: dex })
}

function metValue(mon: Mon, key: string): unknown {
  const word = mon.met.originsWord
  if (key === 'location') return mon.met.mapSectionId
  if (key === 'level') return mon.met.catchLevel
  if (key === 'otFemale') return ((word >>> 15) & 1) === 1
  if (key === 'originsBit11') return ((word >>> 11) & 1) === 1
  return (mon.met as unknown as Record<string, unknown>)[key]
}

function checkMon(mon: Mon, row: Record<string, any>, label: string) {
  const skip = new Set(['met', 'routeId', 'mapsecName', 'routeConfidence', 'warningsContain', 'tag', 'where', 'box', 'slot'])
  for (const [key, value] of Object.entries(row)) {
    if (skip.has(key)) continue
    assert.deepEqual((mon as unknown as Record<string, unknown>)[key], value, `${label} ${key}`)
  }
  if (row.met) {
    for (const [key, value] of Object.entries(row.met as Record<string, unknown>)) {
      assert.deepEqual(metValue(mon, key), value, `${label} met.${key}`)
    }
  }
  for (const warning of row.warningsContain ?? []) {
    assert.equal(mon.warnings.some((item) => item.includes(warning)), true, `${label} warning ${warning}`)
  }
  if (row.routeId !== undefined && row.met) {
    const mapped = sections[String(row.met.location)]?.route_id ?? null
    assert.equal(mapped, row.routeId, `${label} route`)
    assert.equal(sections[String(mon.met.mapSectionId)]?.route_id ?? null, row.routeId, `${label} parsed route`)
  }
}

test('synthetic fixtures cover the import cases and match the parser', () => {
  assert.ok(names.length >= 30)
  for (const name of ['wild-routes', 'evolutions-forms-gen8', 'ingame-trade', 'event-fateful', 'hatched', 'cherish-fossil', 'duplicates-same-route', 'shiny-edges', 'empty-save', 'slot-fallback-checksum', 'slots-both-damaged', 'unknown-species', 'diff-a', 'diff-b']) {
    assert.equal(names.includes(name), true, name)
  }
  for (const name of names) {
    const want = expected(name)
    const size = readFileSync(join(fixtureDir, `${name}.sav`)).length
    assert.equal(size === 0x20000 || size === 0x20010, true, name)
    if (want.error) {
      assert.throws(() => parse(name), new RegExp(want.error.messageIncludes), name)
      continue
    }
    const got = parse(name)
    assert.equal(got.fileSize, want.fileSize, name)
    assert.equal(got.activeSlot, want.activeSlot, name)
    assert.equal(got.checksumsOk, want.checksumsOk, name)
    for (const slot of want.slots) {
      assert.equal(got.slots[slot.slot].valid, slot.valid, `${name} slot ${slot.slot}`)
      assert.equal(got.slots[slot.slot].saveIndex, slot.saveIndex, `${name} index ${slot.slot}`)
      for (const problem of slot.problemsContain) {
        assert.equal(got.slots[slot.slot].problems.some((item: string) => item.includes(problem)), true, `${name} ${problem}`)
      }
      if (slot.valid) assert.deepEqual(got.slots[slot.slot].problems, [], name)
    }
    assert.deepEqual(got.trainer, want.trainer, name)
    assert.equal(got.currentBox, want.currentBox, name)
    assert.deepEqual(got.boxes.map((box) => box.name), want.boxNames, name)
    assert.equal(got.party.length, want.party.length, `${name} party`)
    want.party.forEach((row: Record<string, any>, index: number) => {
      assert.equal(got.party[index].slot, row.slot, name)
      checkMon(got.party[index], row, `${name} party ${row.nickname ?? index}`)
    })
    const boxed = got.boxes.flatMap((box) => box.mons)
    assert.deepEqual(boxed.map((mon) => `${mon.box}:${mon.slot}`), want.boxMons.map((mon: { box: number; slot: number }) => `${mon.box}:${mon.slot}`), name)
    want.boxMons.forEach((row: Record<string, any>, index: number) => checkMon(boxed[index], row, `${name} box ${row.nickname ?? index}`))
    assert.deepEqual(got.dex.seenNat, want.dex.seenNat, name)
    assert.deepEqual(got.dex.caughtNat, want.dex.caughtNat, name)
    assert.deepEqual(got.ownedSpeciesNat, want.ownedSpeciesNat, name)
    assert.deepEqual(got.progress.badges, want.progress.badges, name)
    assert.equal(got.progress.badgeFlagsSet, want.progress.badgeFlagsSet, name)
    assert.equal(got.progress.gameClearFlag, want.progress.gameClearFlag, name)
    assert.equal(got.progress.hallOfFameEntries, want.progress.hallOfFameEntries, name)
    assert.equal(got.warnings.length, want.warnings.count, `${name} warnings ${got.warnings.join(' | ')}`)
    for (const warning of want.warnings.contain) assert.equal(got.warnings.some((item) => item.includes(warning)), true, name)
  }
})

test('unknown species stay as rows, and shiny is only a xor flag', () => {
  const save = parse('unknown-species')
  const unknown = allMons(save).filter((mon) => mon.nat == null)
  assert.equal(unknown.length, 7)
  assert.equal(unknown.some((mon) => mon.speciesId === 252), true)
  assert.equal(unknown.some((mon) => mon.speciesId === 276), true)
  const routes: RouteOption[] = [
    { name: 'route-5', en: 'Route 5', order: 13, group: 'Badge 2' },
  ]
  const plan = planSave(save, {
    me: 'fisi',
    catches: [],
    previousNats: [],
    randomizerSpecies: true,
    routes,
    areas: [],
  })
  assert.equal(plan.skippedUnknown, 0)
  const rows = plan.mons.filter((mon) => mon.unknown)
  assert.equal(rows.length, 7)
  assert.equal(rows.every((mon) => mon.name === UNKNOWN_SPECIES && mon.nat == null && mon.place === 'needs-decision'), true)
  assert.equal(plan.mons.some((mon) => mon.name === 'Bulbasaur' && !mon.unknown), true)

  const shiny = parse('shiny-edges')
  for (const mon of allMons(shiny)) {
    assert.equal(mon.shiny, mon.shinyXor < 16, mon.nickname)
  }
  const byNick = new Map(allMons(shiny).map((mon) => [mon.nickname, mon]))
  assert.equal(byNick.get('Xor15')?.shiny, true)
  assert.equal(byNick.get('Xor16')?.shiny, false)
})

test('diff-a to diff-b is the new-since-last-import set', () => {
  const before = parse('diff-a')
  const after = parse('diff-b')
  const want = expected('diff-a-to-b')
  const got = diffSaves(before, after)
  const withRoute = got.added.map((row) => ({
    ...row,
    routeId: sections[String(row.metLocation)]?.route_id ?? null,
  }))
  assert.deepEqual(withRoute, want.added)
  assert.deepEqual(got.removed, want.removed)
  assert.deepEqual(got.moved, want.moved)
  assert.deepEqual(got.changed, want.changed)
  assert.equal(got.unchangedCount, want.unchangedCount)
  assert.deepEqual(got.dex, want.dex)
  assert.equal(before.activeSlot, 0)
  assert.equal(after.activeSlot, 1)

  const previous = allMons(before).map((mon) => identityOf(mon))
  const plan = planSave(after, {
    me: 'fisi',
    catches: [],
    previousNats: allMons(before).flatMap((mon) => mon.nat ? [mon.nat] : []),
    previousIds: [...previous],
    randomizerSpecies: true,
    routes: [
      { name: 'route-2', en: 'Route 2', order: 5, group: 'Opening' },
      { name: 'route-5', en: 'Route 5', order: 13, group: 'Badge 2' },
      { name: 'route-7', en: 'Route 7', order: 19, group: 'Badge 3' },
      { name: 'route-8', en: 'Route 8', order: 21, group: 'Badge 3' },
      { name: 'route-17', en: 'Route 17', order: 53, group: 'Badge 6' },
      { name: 'redwood-village', en: 'Redwood Village', order: 61, group: 'Badge 8' },
    ],
    areas: [],
  })
  const fresh = new Set(want.added.map((row: { nickname: string }) => row.nickname))
  for (const mon of plan.mons) {
    if (!mon.nickname) continue
    assert.equal(mon.newSinceImport, fresh.has(mon.nickname), mon.nickname)
  }
})

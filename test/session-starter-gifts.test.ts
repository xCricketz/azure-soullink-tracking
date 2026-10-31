import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { entryChoice, durableAuthStorage, memoryCookieJar, memoryStore } from '../src/lib/auth-persist.ts'
import { matchGiftSlot, trackerRoutes } from '../src/lib/gift-slots.ts'
import { planSave, type RouteOption } from '../src/lib/save/plan.ts'
import { boxMon, boxSlot, buildSave } from '../src/lib/save/synthetic.ts'
import { parseSave, type SpeciesTable } from '../src/lib/save/unbound-save.ts'

const here = dirname(fileURLToPath(import.meta.url))
const table: SpeciesTable = JSON.parse(readFileSync(join(here, '../src/data/unbound/species-table.json'), 'utf8'))
const dex = JSON.parse(readFileSync(join(here, '../src/data/unbound/dex.json'), 'utf8'))

const routes: RouteOption[] = [
  { name: 'starter', en: 'Starter', order: 0, group: 'Opening' },
  { name: 'route-1', en: 'Route 1', order: 2, group: 'Opening' },
  { name: 'bellin-town', en: 'Bellin Town', order: 3, group: 'Opening' },
  { name: 'route-5', en: 'Route 5', order: 13, group: 'Badge 1' },
  { name: 'cinder-volcano-depths', en: 'Cinder Volcano Depths', order: 38, group: 'Side' },
]

test('a stored session opens the app and survives a localStorage wipe', () => {
  assert.equal(entryChoice('seri@soullink.app'), 'app')
  assert.equal(entryChoice('fisi@soullink.app'), 'app')
  assert.equal(entryChoice(null), 'login')
  assert.equal(entryChoice('someone@example.com'), 'login')
  const local = memoryStore()
  const jar = memoryCookieJar()
  const storage = durableAuthStorage(local, jar)
  const session = JSON.stringify({ access_token: 'a', refresh_token: 'r', user: { email: 'seri@soullink.app' } })
  storage.setItem('sb-test-auth-token', session)
  local.removeItem('sb-test-auth-token')
  assert.equal(storage.getItem('sb-test-auth-token'), session)
  storage.removeItem('sb-test-auth-token')
  assert.equal(storage.getItem('sb-test-auth-token'), null)
})

test('the starter slot is first and only the earliest Shadow Base level 10 is the starter', () => {
  const list = trackerRoutes()
  assert.equal(list[0]?.name, 'starter')
  assert.equal(list[0]?.en, 'Starter')
  const bellin = list.findIndex((route) => route.name === 'bellin-town')
  assert.equal(list[bellin + 1]?.name, 'gift-bellin-gentleman')
  const sav = buildSave({
    indexA: 8,
    indexB: 1,
    mutate: (sectors) => {
      boxMon(sectors, boxSlot(0, 0), null, 0, 1, 1000, 1001, { location: 133, level: 10, ball: 3 })
      boxMon(sectors, boxSlot(0, 1), null, 0, 7, 1000, 1002, { location: 133, level: 10, ball: 3 })
      boxMon(sectors, boxSlot(0, 2), null, 0, 6, 100000, 1003, { location: 133, level: 65, ball: 0 })
    },
  })
  const plan = planSave(parseSave(sav, { table, dexNames: dex }), {
    me: 'fisi',
    catches: [],
    previousNats: [],
    randomizerSpecies: true,
    routes,
    areas: [],
  })
  const bySlot = new Map(plan.mons.map((mon) => [mon.slot, mon]))
  assert.equal(bySlot.get(0)?.suggestedRoute, 'starter')
  assert.equal(bySlot.get(0)?.decision, 'starter')
  assert.equal(bySlot.get(0)?.starterRule, 'S1')
  assert.equal(bySlot.get(1)?.starterRule, null)
  assert.equal(bySlot.get(1)?.suggestedRoute, 'cinder-volcano-depths')
  assert.equal(bySlot.get(2)?.suggestedRoute, 'cinder-volcano-depths')
  assert.equal(bySlot.get(2)?.decision, null)
})

test('a Bellin Town egg and a Route 5 species gift get their own slots', () => {
  const egg = matchGiftSlot({
    ownOT: true,
    name: 'Stunky',
    met: { category: 'hatched', location: 89, level: 0 },
  })
  assert.equal(egg?.id, 'gift-bellin-gentleman')
  assert.equal(egg?.label, 'Bellin Town – Gift egg')
  const snivy = matchGiftSlot({
    ownOT: true,
    name: 'Snivy',
    met: { category: 'area', location: 105, level: 5 },
  })
  assert.equal(snivy?.id, 'gift-route-5-unova')
  assert.equal(snivy?.confidence, 'likely')
  assert.equal(matchGiftSlot({
    ownOT: true,
    name: 'Snivy',
    met: { category: 'area', location: 101, level: 5 },
  }), null)
  const sav = buildSave({
    indexA: 4,
    indexB: 1,
    mutate: (sectors) => {
      boxMon(sectors, boxSlot(0, 0), null, 0, 487, 1000, 2001, { location: 89, level: 0, ball: 4 })
      boxMon(sectors, boxSlot(0, 1), null, 0, 548, 1000, 2002, { location: 105, level: 5, ball: 3 })
    },
  })
  const plan = planSave(parseSave(sav, { table, dexNames: dex }), {
    me: 'fisi',
    catches: [],
    previousNats: [],
    randomizerSpecies: false,
    routes,
    areas: [],
  })
  const bySlot = new Map(plan.mons.map((mon) => [mon.slot, mon]))
  assert.equal(bySlot.get(0)?.name, 'Stunky')
  assert.equal(bySlot.get(0)?.suggestedRoute, 'gift-bellin-gentleman')
  assert.equal(bySlot.get(0)?.decision, 'gift')
  assert.equal(bySlot.get(1)?.name, 'Snivy')
  assert.equal(bySlot.get(1)?.suggestedRoute, 'gift-route-5-unova')
  assert.notEqual(bySlot.get(1)?.suggestedRoute, 'route-5')
})

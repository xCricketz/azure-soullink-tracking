import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { appCookiePath, entryChoice, durableAuthStorage, memoryCookieJar, memoryStore } from '../src/lib/auth-persist.ts'
import { genericGiftFromId, matchGiftSlot, trackerRoutes } from '../src/lib/gift-slots.ts'
import { buildRouteList } from '../src/lib/pairs.ts'
import { confirmFailureText, planSave, type RouteOption } from '../src/lib/save/plan.ts'
import { boxMon, boxSlot, buildSave } from '../src/lib/save/synthetic.ts'
import { routeTitleByKey } from '../src/data/routes.ts'
import type { Catch } from '../src/lib/types.ts'
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

test('a failed confirm names the Pokémon and the route', () => {
  assert.equal(
    confirmFailureText('Hydreigon', 'Orochi', 'Bellin Town', 'This route already has your catch.'),
    'Hydreigon ‘Orochi’ on Bellin Town was not saved. This route already has your catch.',
  )
})

test('a stored session opens the app and survives a localStorage wipe', () => {
  assert.equal(entryChoice('seri@soullink.app'), 'app')
  assert.equal(entryChoice('fisi@soullink.app'), 'app')
  assert.equal(entryChoice(null), 'login')
  assert.equal(entryChoice('someone@example.com'), 'login')
  assert.equal(appCookiePath('/azure-soullink-tracking/'), '/azure-soullink-tracking/')
  assert.equal(appCookiePath('/azure-soullink-tracking'), '/azure-soullink-tracking/')
  assert.equal(appCookiePath('/'), '/')
  assert.equal(appCookiePath(undefined), '/')
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

test('map section 88 is Frozen Heights and only the S1 mon is the starter', () => {
  const sav = buildSave({
    indexA: 8,
    indexB: 1,
    mutate: (sectors) => {
      boxMon(sectors, boxSlot(0, 0), null, 0, 1, 1000, 3001, { location: 133, level: 10, ball: 3 })
      boxMon(sectors, boxSlot(0, 1), null, 0, 4, 1000, 3002, { location: 88, level: 10, ball: 3 })
      boxMon(sectors, boxSlot(0, 2), null, 0, 7, 1000, 3003, { location: 88, level: 10, ball: 3 })
    },
  })
  const plan = planSave(parseSave(sav, { table, dexNames: dex }), {
    me: 'fisi',
    catches: [],
    previousNats: [],
    randomizerSpecies: true,
    routes: [...routes, { name: 'frozen-heights', en: 'Frozen Heights', order: 1, group: 'Opening' }],
    areas: [],
  })
  const starters = plan.mons.filter((mon) => mon.suggestedRoute === 'starter' || mon.decision === 'starter')
  assert.equal(starters.length, 1)
  assert.equal(starters[0]?.starterRule, 'S1')
  assert.equal(starters[0]?.slot, 0)
  const heights = plan.mons.filter((mon) => mon.mapSectionId === 88)
  assert.equal(heights.length, 2)
  for (const mon of heights) {
    assert.equal(mon.starterRule, null)
    assert.equal(mon.suggestedRoute, 'frozen-heights')
    assert.equal(mon.placeName, 'Frozen Heights')
    assert.notEqual(mon.decision, 'starter')
  }
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

test('a randomized Cherish Ball uses the gift slot, and a Poké Ball stays on Bellin Town', () => {
  const sav = buildSave({
    indexA: 8,
    indexB: 1,
    mutate: (sectors) => {
      boxMon(sectors, boxSlot(0, 0), null, 0, 699, 1000, 4001, { location: 133, level: 10, ball: 3 })
      boxMon(sectors, boxSlot(0, 1), null, 0, 536, 1000, 4002, { location: 141, level: 10, ball: 3 })
      boxMon(sectors, boxSlot(0, 2), null, 0, 778, 1000, 4003, { location: 101, level: 9, ball: 3 })
      boxMon(sectors, boxSlot(0, 3), null, 0, 688, 1000, 4004, { location: 89, level: 10, ball: 15 })
      boxMon(sectors, boxSlot(0, 4), null, 0, 250, 1000, 4005, { location: 88, level: 1, ball: 15 })
      boxMon(sectors, boxSlot(0, 5), null, 0, 19, 1000, 4006, { location: 89, level: 4, ball: 3 })
    },
  })
  const parsed = parseSave(sav, { table, dexNames: dex })
  const routeOptions = trackerRoutes().map((route) => ({ name: route.name, en: route.en, order: route.order, group: route.group }))
  for (const randomizerSpecies of [true, false]) {
    const plan = planSave(parsed, {
      me: 'seri',
      catches: [],
      previousNats: [],
      randomizerSpecies,
      routes: routeOptions,
      areas: [],
    })
    const bySlot = new Map(plan.mons.map((mon) => [mon.slot, mon]))
    assert.equal(bySlot.get(0)?.name, 'Kyurem')
    assert.equal(bySlot.get(0)?.suggestedRoute, 'starter')
    assert.equal(bySlot.get(1)?.name, 'Dialga')
    assert.equal(bySlot.get(1)?.suggestedRoute, 'icicle-cave')
    assert.equal(bySlot.get(2)?.name, 'Floette')
    assert.equal(bySlot.get(2)?.suggestedRoute, 'route-1')
    assert.equal(bySlot.get(3)?.name, 'Hydreigon')
    assert.equal(bySlot.get(3)?.suggestedRoute, 'gift-bellin-gentleman')
    assert.equal(bySlot.get(3)?.decision, 'gift')
    assert.notEqual(bySlot.get(3)?.suggestedRoute, 'bellin-town')
    const hooh = bySlot.get(4)
    assert.equal(hooh?.name, 'Ho-Oh')
    assert.equal(hooh?.suggestedRoute, 'gift-frozen-heights')
    assert.equal(hooh?.decision, 'gift')
    assert.equal(hooh?.confidence, 'guess')
    assert.equal(hooh?.placeName, 'Frozen Heights – Gift')
    assert.notEqual(hooh?.suggestedRoute, 'frozen-heights')
    assert.equal(bySlot.get(5)?.name, 'Rattata')
    assert.equal(bySlot.get(5)?.suggestedRoute, 'bellin-town')
    assert.equal(bySlot.get(5)?.decision, null)
  }
  const gift = genericGiftFromId('gift-frozen-heights')
  assert.equal(gift?.en, 'Frozen Heights – Gift')
  assert.equal(routeTitleByKey('gift-frozen-heights'), 'Frozen Heights – Gift')
  const logged: Catch = {
    id: 'hooh',
    run_id: 'run',
    player: 'seri',
    route: 'gift-frozen-heights',
    route_order: gift?.order ?? 0,
    pokemon: 'Ho-Oh',
    dex_id: 250,
    form: null,
    nickname: 'Marco',
    status: 'alive',
    in_team: false,
    team_order: null,
    level: 1,
    note: null,
    death_cause: null,
    epitaph: null,
    died_at: null,
    created_at: '2026-10-31T23:10:00.000Z',
    updated_at: '2026-10-31T23:10:00.000Z',
  }
  const names = buildRouteList([logged], []).map((route) => route.name)
  const heights = names.indexOf('frozen-heights')
  assert.equal(names[heights + 1], 'gift-frozen-heights')
  assert.equal(matchGiftSlot({
    ownOT: true,
    name: 'Rattata',
    randomizerSpecies: true,
    met: { category: 'area', location: 89, level: 4, ball: 3 },
  }), null)
})

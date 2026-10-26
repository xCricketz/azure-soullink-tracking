import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { decisionCopy } from '../src/lib/save/locations.ts'
import { planSave } from '../src/lib/save/plan.ts'
import { parseSave } from '../src/lib/save/unbound-save.ts'

const here = dirname(fileURLToPath(import.meta.url))
const dir = join(here, '../save-import/fixtures-synthetic')
const table = JSON.parse(readFileSync(join(here, '../src/data/unbound/species-table.json'), 'utf8'))
const dex = JSON.parse(readFileSync(join(here, '../src/data/unbound/dex.json'), 'utf8'))
const routes = JSON.parse(readFileSync(join(here, '../src/data/unbound/routes.json'), 'utf8')) as {
  key: string
  name: string
  order: number
  soullink_route: boolean
}[]
const routeOptions = routes.filter((route) => route.soullink_route).map((route) => ({
  name: route.key,
  en: route.name,
  order: route.order,
  group: 'All',
}))

interface ExpectedMon {
  where: string
  box?: number
  slot: number
  nickname?: string
  ownOT?: boolean
  met?: { location?: number; category?: string; level?: number }
}

test('every synthetic fixture classifies trades and events from the met location', () => {
  const files = readdirSync(dir).filter((name) => name.endsWith('.expected.json'))
  assert.ok(files.length >= 30)
  let checked = 0
  let events = 0
  let trades = 0
  for (const name of files) {
    const expected = JSON.parse(readFileSync(join(dir, name), 'utf8')) as {
      file?: string
      party?: ExpectedMon[]
      boxMons?: ExpectedMon[]
    }
    const savName = expected.file ?? name.replace(/\.expected\.json$/, '.sav')
    const savPath = join(dir, savName)
    let buf: Uint8Array
    try {
      buf = new Uint8Array(readFileSync(savPath))
    } catch {
      continue
    }
    let save
    try {
      save = parseSave(buf, { table, dexNames: dex })
    } catch {
      continue
    }
    const plan = planSave(save, {
      me: 'fisi',
      catches: [],
      previousNats: [],
      randomizerSpecies: true,
      routes: routeOptions,
      areas: [],
    })
    const rows = [...(expected.party ?? []), ...(expected.boxMons ?? [])]
    for (const row of rows) {
      const id = row.where === 'party' ? `party-${row.slot}` : `box-${row.box ?? 0}-${row.slot}`
      const mon = plan.mons.find((item) => item.id === id)
      if (!mon || !row.met) continue
      const category = row.met.category
      const section = row.met.location ?? 0
      if (category === 'fateful-event' || section === 255) {
        assert.equal(mon.decision, 'event', `${name} ${id} ${row.nickname ?? ''} should be an event`)
        events += 1
      } else if (category === 'in-game-trade' || section === 254) {
        assert.equal(mon.decision, 'trade', `${name} ${id} ${row.nickname ?? ''} should be a trade`)
        trades += 1
      }
      const where = mon.placeName ?? 'an unknown place'
      const copy = decisionCopy({
        decision: mon.decision,
        mapSectionId: mon.mapSectionId,
        ownOT: mon.ownOT,
        placeName: mon.placeName,
        where,
      }) ?? ''
      if (row.nickname === 'TradeOwn') {
        assert.equal(mon.ownOT, true)
        assert.equal(mon.decision, 'trade')
        assert.equal(copy.includes('Caught by another trainer'), false, copy)
        assert.match(copy, /In-game trade/)
      }
      if (section === 88 && category === 'area') {
        assert.match(copy, /Frozen Heights \(starter town, no Soul-Link route\)/)
      }
      if (category === 'fateful-event' || section === 255) {
        assert.equal(copy.includes('Caught by another trainer'), false, `${name} ${copy}`)
        assert.match(copy, /Event/)
      }
      checked += 1
    }
  }
  assert.ok(checked > 100, `only checked ${checked} rows`)
  assert.ok(events >= 4, `events ${events}`)
  assert.ok(trades >= 4, `trades ${trades}`)
})

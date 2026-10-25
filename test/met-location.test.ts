import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { BALL_NAMES, buildMetInfo, parseSave, type SpeciesTable } from '../src/lib/save/unbound-save.ts'
import { buildSave } from '../src/lib/save/synthetic.ts'

const here = dirname(fileURLToPath(import.meta.url))
const table: SpeciesTable = JSON.parse(readFileSync(join(here, '../src/data/unbound/species-table.json'), 'utf8'))
const dex = JSON.parse(readFileSync(join(here, '../src/data/unbound/dex.json'), 'utf8'))

describe('Met location decoding', () => {
  test('buildMetInfo reads the origins word and the special ids', () => {
    const origins = 25 | (4 << 7) | (1 << 15)
    assert.deepEqual(buildMetInfo(119, origins, 3), {
      mapSectionId: 119,
      catchLevel: 25,
      originsWord: origins,
      originGame: 4,
      originGameName: 'FireRed',
      ball: 3,
      ballName: 'Poké',
      category: 'area',
    })
    assert.equal(buildMetInfo(146, 4 << 7, 3).category, 'hatched')
    assert.equal(buildMetInfo(254, 50 | (4 << 7), 3).category, 'in-game-trade')
    assert.equal(buildMetInfo(255, 50 | (4 << 7), 15).category, 'fateful-event')
    assert.equal(buildMetInfo(253, 4 << 7, 3).category, 'special-egg')
    assert.equal(buildMetInfo(0, 5 | (4 << 7), 3).category, 'none')
    assert.equal(buildMetInfo(120, 5 | (3 << 7), 3).category, 'foreign-origin')
    assert.equal(buildMetInfo(120, 5 | (3 << 7), 3).originGameName, 'Emerald')
    assert.equal(buildMetInfo(30, 5 | (4 << 7), 3).category, 'unknown-location')
    assert.equal(buildMetInfo(100, (4 << 7) | 11, 99).ballName, null)
    assert.equal(BALL_NAMES[4], 'Safari')
  })

  test('box byte 0x33 and party byte 0x45 are the map section, and they do not touch the IVs', () => {
    const sav = buildSave({
      indexA: 2,
      indexB: 1,
      mutate: (sectors) => {
        new DataView(sectors[1].buffer).setUint32(0x34, 1, true)
        const party = new Uint8Array(100)
        const view = new DataView(party.buffer)
        view.setUint32(0, 0x1111, true)
        view.setUint16(0x20, 1078, true)
        view.setUint32(0x24, 1000, true)
        party[0x54] = 10
        party[0x45] = 138
        view.setUint16(0x46, 80 | (4 << 7), true)
        party[0x2a] = 1
        sectors[1].set(party, 0x38)
        const box = new Uint8Array(58)
        const boxView = new DataView(box.buffer)
        boxView.setUint32(0, 0x2222, true)
        boxView.setUint16(28, 626, true)
        box[19] = 2
        boxView.setUint32(32, 1000, true)
        box[0x33] = 164
        boxView.setUint16(0x34, 61 | (4 << 7) | (1 << 15), true)
        box[0x26] = 4
        sectors[5].set(box, 4)
      },
    })
    const parsed = parseSave(sav, { table, dexNames: dex })
    assert.deepEqual(parsed.party[0]?.met, {
      mapSectionId: 138,
      catchLevel: 80,
      originsWord: 80 | (4 << 7),
      originGame: 4,
      originGameName: 'FireRed',
      ball: 1,
      ballName: 'Ultra',
      category: 'area',
    })
    assert.equal(parsed.boxes[0]?.mons[0]?.met.mapSectionId, 164)
    assert.equal(parsed.boxes[0]?.mons[0]?.met.catchLevel, 61)
    assert.equal(parsed.boxes[0]?.mons[0]?.met.ballName, 'Safari')
    assert.equal(parsed.boxes[0]?.mons[0]?.met.category, 'area')
    assert.deepEqual(parsed.boxes[0]?.mons[0]?.ivs, [0, 0, 0, 0, 0, 0])
  })
})

describe('mapsec-to-route.json', () => {
  const doc = JSON.parse(readFileSync(join(here, '../src/data/unbound/mapsec-to-route.json'), 'utf8')) as Record<string, { name: string; route_id: string | null; confidence: string }>
  const routeRows = JSON.parse(readFileSync(join(here, '../src/data/unbound/routes.json'), 'utf8')) as { key: string; soullink_route: boolean }[]
  const keys = new Set(routeRows.map((row) => row.key))
  const gyms = ['dresco-gym', 'crater-gym', 'blizzard-gym', 'fallshore-gym', 'dehara-gym', 'antisis-gym', 'polder-gym', 'redwood-gym']

  test('ids 88 through 196 are present, and each route id exists', () => {
    const ids = Object.keys(doc).map(Number).sort((a, b) => a - b)
    assert.equal(ids.length, 109)
    assert.equal(ids[0], 88)
    assert.equal(ids[108], 196)
    for (let id = 88; id <= 196; id++) assert.ok(doc[String(id)], `missing ${id}`)
    for (const row of Object.values(doc)) {
      assert.ok(['verified', 'likely', 'guess', 'unmapped'].includes(row.confidence))
      assert.equal(typeof row.name, 'string')
      assert.ok(row.name.length > 0)
      if (row.route_id === null) assert.equal(row.confidence, 'unmapped')
      else {
        assert.ok(keys.has(row.route_id), row.route_id)
        assert.notEqual(row.confidence, 'unmapped')
      }
    }
  })

  test('every soul-link route has a map section, and the eight gyms do not', () => {
    const mapped = new Set(Object.values(doc).map((row) => row.route_id).filter(Boolean))
    for (const row of routeRows) {
      if (row.soullink_route) assert.ok(mapped.has(row.key), row.key)
    }
    for (const gym of gyms) assert.equal(mapped.has(gym), false)
  })
})

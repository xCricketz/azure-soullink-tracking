import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  decodeText,
  expForLevel,
  levelFromExp,
  natureOf,
  parseSave,
  readBoxNames,
  sectorChecksum,
  type SpeciesTable,
} from '../src/lib/save/unbound-save.ts'
import { boxMon, buildSave, encodeGen3, type Sectors } from '../src/lib/save/synthetic.ts'

const here = dirname(fileURLToPath(import.meta.url))
const table: SpeciesTable = JSON.parse(readFileSync(join(here, '../src/data/unbound/species-table.json'), 'utf8'))
const dexPath = join(here, '../src/data/unbound/dex.json')
const dex = existsSync(dexPath) ? JSON.parse(readFileSync(dexPath, 'utf8')) : []
const REAL_SAV = process.env.UNBOUND_SAV ?? join(here, '../inputs/fisi-save.sav')

function expect(actual: unknown) {
  return {
    toBe(expected: unknown) {
      assert.equal(actual, expected)
    },
    toEqual(expected: unknown) {
      assert.deepEqual(actual, expected)
    },
    toMatchObject(expected: Record<string, unknown>) {
      assert.equal(typeof actual, 'object')
      assert.notEqual(actual, null)
      for (const [key, value] of Object.entries(expected)) {
        assert.deepEqual((actual as Record<string, unknown>)[key], value, key)
      }
    },
    toThrow() {
      assert.equal(typeof actual, 'function')
      assert.throws(actual as () => void)
    },
    toBeGreaterThan(value: number) {
      assert.ok(typeof actual === 'number' && actual > value)
    },
    toBeGreaterThanOrEqual(value: number) {
      assert.ok(typeof actual === 'number' && actual >= value)
    },
  }
}

describe('Helfer', () => {
  test('Gen-3-Text', () => {
    expect(decodeText(Uint8Array.from([0xd4, 0xd9, 0xe6, 0xd5, 0xe3, 0xe6, 0xd5, 0xff, 0x09, 0x03]))).toBe('Zeraora')
    expect(decodeText(Uint8Array.from([0xc5, 0x1b, 0xd5, 0xa2, 0xab, 0xff]))).toBe('Kéa1!')
  })
  test('EXP-Kurven Level 100 + Level-Rückrechnung', () => {
    expect([0, 1, 2, 3, 4, 5].map((growth) => expForLevel(growth, 100))).toEqual([1000000, 600000, 1640000, 1059860, 800000, 1250000])
    expect(levelFromExp(5, 640000)).toBe(80)
    expect(levelFromExp(5, 639999)).toBe(79)
    expect(levelFromExp(3, 0)).toBe(1)
    expect(levelFromExp(0, 5e6)).toBe(100)
  })
  test('Nature = PID % 25', () => {
    expect(natureOf(0)).toBe('Hardy')
    expect(natureOf(3)).toBe('Adamant')
    expect(natureOf(24)).toBe('Quirky')
    expect(natureOf(0xffffffff)).toBe(natureOf(0xffffffff % 25))
  })
  test('Checksumme (bekannter Fall)', () => {
    const data = new Uint8Array(8)
    data[0] = 1
    data[4] = 0xff
    data[5] = 0xff
    expect(sectorChecksum(data, 8)).toBe(1)
  })
  test('Box-Namensreihenfolge', () => {
    const sector = new Uint8Array(0xff0)
    const raw = ['Preset', ...Array.from({ length: 10 }, (_, i) => `Box${24 - i}`), ...Array.from({ length: 14 }, (_, i) => `Box${i + 1}`)]
    raw.forEach((name, index) => {
      const bytes = new Uint8Array(9).fill(0xff)
      ;[...name].forEach((char, pos) => {
        bytes[pos] = char >= '0' && char <= '9' ? 0xa1 + +char : char >= 'a' ? 0xd5 + char.charCodeAt(0) - 97 : 0xbb + char.charCodeAt(0) - 65
      })
      sector.set(bytes, 0x442 - 225 + index * 9)
    })
    const names = readBoxNames(sector)
    expect(names[0]).toBe('Box1')
    expect(names[13]).toBe('Box14')
    expect(names[14]).toBe('Box15')
    expect(names[23]).toBe('Box24')
    expect(names[24]).toBe('Preset')
  })
})

describe('Speziestabelle (aus ROM extrahiert)', () => {
  test('Form und Stichproben', () => {
    expect(table.numSpecies).toBe(1294)
    expect(table.species.length).toBe(1294)
    expect(table.species[1].nat).toBe(1)
    expect(table.species[1078].nat).toBe(807)
    expect(table.species[626].nat).toBe(573)
    expect(table.species[277].nat).toBe(252)
    expect(table.species[1078].growth).toBe(5)
  })
  test('alle 905 National-Nummern vorhanden', () => {
    const present = new Set(table.species.filter((row) => row.id > 0).map((row) => row.nat))
    for (let nat = 1; nat <= 905; nat++) expect(present.has(nat)).toBe(true)
  })
  test('Typen stimmen für >= 895 Basis-Spezies mit dex.json überein', () => {
    if (!dex.length) return
    const names = ['Normal', 'Fighting', 'Flying', 'Poison', 'Ground', 'Rock', 'Bug', 'Ghost', 'Steel', '?', 'Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Ice', 'Dragon', 'Dark']
    const base = new Map<number, string[]>()
    for (const row of dex) if (row.form == null) base.set(row.nat, [...row.types].sort())
    const seen = new Set<number>()
    let ok = 0
    let tot = 0
    for (const row of table.species) {
      if (row.id === 0 || !row.nat || seen.has(row.nat) || !base.has(row.nat)) continue
      seen.add(row.nat)
      const types = row.types.map((type) => (type === 23 ? 'Fairy' : names[type]))
      const unique = [...new Set(types)].sort()
      tot++
      if (JSON.stringify(unique) === JSON.stringify(base.get(row.nat))) ok++
    }
    expect(tot).toBeGreaterThan(895)
    expect(ok).toBeGreaterThanOrEqual(tot - 1)
  })
})

describe('Synthetischer Save', () => {
  test('aktiver Slot = höherer Save-Index, Box-Mon-Adressierung inkl. erweiterter Boxen', () => {
    const sav = buildSave({
      indexA: 5,
      indexB: 4,
      mutate: (sectors) => {
        new DataView(sectors[1].buffer).setUint32(0x34, 1, true)
        const party = new Uint8Array(100)
        const view = new DataView(party.buffer)
        view.setUint32(0, 0x12345678, true)
        view.setUint32(4, 1234 | (4321 << 16), true)
        party.set(encodeGen3('Zeraora'), 8)
        party[15] = 0xff
        view.setUint16(0x20, 1078, true)
        view.setUint32(0x24, 640000, true)
        party[0x54] = 80
        sectors[1].set(party, 0x38)
        boxMon(sectors, { id: 5, o: 4 }, null, 0, 1078, 640000, 3)
        boxMon(sectors, { id: 0, o: 0xb0 }, null, 0, 626, 800000, 6)
        boxMon(sectors, { id: 2, o: 0xf18 }, null, 0, 1, 1000, 9)
        const tmp: Sectors = { 9: new Uint8Array(58) }
        boxMon(tmp, { id: 9, o: 0 }, null, 0, 4, 2000, 12)
        sectors[2].set(tmp[9].subarray(0, 42), 0xf18 + 174)
        sectors[3].set(tmp[9].subarray(42), 0)
        sectors[1][0x310 + (806 >> 3)] |= 1 << (806 & 7)
        sectors[1][0x38d + (806 >> 3)] |= 1 << (806 & 7)
        for (let i = 0; i < 8; i++) {
          const flag = 0x820 + i
          const flags = new Uint8Array(sectors[1].buffer, 0xee0, 0x110)
          flags[flag >> 3] |= 1 << (flag & 7)
        }
      },
      extra: (buf) => {
        const row = new Uint8Array(58)
        new DataView(row.buffer).setUint32(0, 77, true)
        new DataView(row.buffer).setUint16(28, 252 + 25, true)
        buf.set(row, 30 * 0x1000 + 0xb0c)
      },
    })
    const res = parseSave(sav, { table, dexNames: dex })
    expect(res.activeSlot).toBe(0)
    expect(res.checksumsOk).toBe(true)
    expect(res.trainer.name).toBe('Test')
    expect(res.trainer.tid).toBe(1234)
    expect(res.trainer.sid).toBe(4321)
    expect(res.party.length).toBe(1)
    expect(res.party[0]).toMatchObject({ speciesId: 1078, nat: 807, level: 80, levelSource: 'stored', nickname: 'Zeraora', ownOT: true })
    expect(res.boxes[0].mons[0]).toMatchObject({ speciesId: 1078, level: 80, levelSource: 'exp-derived', nickname: 'Nick', moves: [1, 2, 3, 4], ownOT: true })
    expect(res.boxes[0].mons[0].ivs[0]).toBe(31)
    expect(res.boxes[0].mons[0].ivs[1]).toBe(1)
    expect(res.boxes[24].mons[0]).toMatchObject({ speciesId: 626, slot: 0 })
    expect(res.boxes[22].mons[0]).toMatchObject({ speciesId: 1, slot: 0 })
    expect(res.boxes[19].mons[0].speciesId).toBe(277)
    expect(res.boxes[22].mons[1]).toMatchObject({ speciesId: 4, slot: 3, exp: 2000 })
    expect(res.dex.caughtNat).toEqual([807])
    expect(res.dex.seenCount).toBe(1)
    expect(res.progress.badgeFlagsSet).toBe(8)
    expect(res.warnings.some((warning) => warning.includes('nicht im Caught'))).toBe(true)
  })

  test('Fallback auf älteren Slot bei Checksummenfehler', () => {
    const sav = buildSave({ indexA: 9, indexB: 8 })
    sav[0x100] ^= 0xff
    const res = parseSave(sav, { table })
    expect(res.activeSlot).toBe(1)
    expect(res.checksumsOk).toBe(false)
    expect(res.slots[0].problems.length).toBeGreaterThan(0)
  })

  test('Fehler wenn beide Slots kaputt', () => {
    const sav = buildSave({ indexA: 9, indexB: 8 })
    sav[0x100] ^= 0xff
    sav[0xe000 + 0x100] ^= 0xff
    expect(() => parseSave(sav, { table })).toThrow()
  })

  test('Flashcart-Header (+16 Byte) und falsche Größe', () => {
    const sav = buildSave({ indexA: 2, indexB: 1 })
    const big = new Uint8Array(0x20010)
    big.set(sav, 16)
    expect(parseSave(big, { table }).activeSlot).toBe(0)
    expect(() => parseSave(new Uint8Array(1000), { table })).toThrow()
  })
})

const hasReal = existsSync(REAL_SAV)
describe('Echter Save (nur lesen)', { skip: !hasReal }, () => {
  const bytes = hasReal ? new Uint8Array(readFileSync(REAL_SAV)) : new Uint8Array()
  const res = hasReal ? parseSave(bytes, { table, dexNames: dex }) : (undefined as never)
  test('beide Slots gültig, Slot 0 aktiv (Index 1404 > 1403)', () => {
    expect(res.checksumsOk).toBe(true)
    expect(res.activeSlot).toBe(0)
    expect(res.slots.map((slot) => slot.saveIndex)).toEqual([1404, 1403])
  })
  test('Trainer', () => {
    expect(res.trainer).toMatchObject({ name: 'Mage', tid: 47526, sid: 48663 })
  })
  test('Team: 2 Mons, gespeichertes Level == aus EXP abgeleitetes Level', () => {
    expect(res.party.length).toBe(2)
    for (const mon of res.party) {
      const row = table.species[mon.speciesId]
      expect(levelFromExp(row.growth, mon.exp)).toBe(mon.level!)
    }
    expect(res.party.map((mon) => mon.nat)).toEqual([807, 573])
  })
  test('Boxen: 394 Mons, alle Species-IDs bekannt, alle Natures gültig', () => {
    const all = res.boxes.flatMap((box) => box.mons)
    expect(res.boxes.length).toBe(25)
    expect(all.length).toBe(394)
    for (const mon of all) {
      expect(mon.nat).not.toBeNull()
      expect(mon.level!).toBeGreaterThanOrEqual(1)
      expect(mon.level!).toBeLessThanOrEqual(100)
      expect(mon.warnings).toEqual([])
    }
    expect(res.boxes[24].name).toBe('Preset')
    expect(res.currentBox).toBe(24)
  })
  test('Pokédex: gefangen 870 / gesehen 878; jede besessene Spezies ist gefangen', () => {
    expect(res.dex.caughtCount).toBe(870)
    expect(res.dex.seenCount).toBe(878)
    expect(res.warnings).toEqual([])
    const caught = new Set(res.dex.caughtNat)
    for (const nat of res.ownedSpeciesNat) expect(caught.has(nat)).toBe(true)
    for (const nat of res.dex.caughtNat) expect(res.dex.seenNat.includes(nat)).toBe(true)
    for (let nat = 1; nat <= 809; nat++) expect(caught.has(nat)).toBe(true)
  })
  test('Fortschritt: 8 Badges, Game-Clear, Hall of Fame', () => {
    expect(res.progress.badgeFlagsSet).toBe(8)
    expect(res.progress.gameClearFlag).toBe(true)
    expect(res.progress.hallOfFameEntries).toBeGreaterThan(0)
  })
  test('Eingabe unverändert (Parser schreibt nie)', () => {
    const again = new Uint8Array(readFileSync(REAL_SAV))
    expect(createHash('md5').update(bytes).digest('hex')).toBe(createHash('md5').update(again).digest('hex'))
  })
})

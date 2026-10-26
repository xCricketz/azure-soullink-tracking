/**
 * Run options and starter recognition from the v6 research bundle.
 * Real saves are optional and are not in this repo.
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { confirmAllIds, planSave, type RouteOption } from '../src/lib/save/plan.ts'
import {
  classifyStarter,
  detectionChoices,
  DIFFICULTY_NAMES,
  FLAG_CUTSCENES_SKIPPED,
  FLAG_LEVELCAP_ACTIVE,
  FLAG_LEVELCAP_START,
  FLAG_NGPLUS,
  FLAG_NGPLUS_AUX,
  FLAG_RANDOMIZER_ABILITY,
  FLAG_RANDOMIZER_MOVESET,
  FLAG_RANDOMIZER_SPECIES,
  FLAG_SANDBOX,
  FLAG_SCALEMONS,
  patchFromDetection,
  readRunOptions,
  readRunOptionsFromSave,
  VAR_DIFFICULTY,
  type SaveRunOptions,
} from '../src/lib/save/run-options.ts'
import { boxMon, boxSlot, buildSave, type Sectors } from '../src/lib/save/synthetic.ts'
import { parseSave, SECTOR_DATA, type SpeciesTable } from '../src/lib/save/unbound-save.ts'

const here = dirname(fileURLToPath(import.meta.url))
const OLD_SAV = join(here, '../inputs/fisi-save.sav')
const NEW_SAV = join(here, '../inputs/fisi-new-run-ngplus.sav')
const table: SpeciesTable = JSON.parse(readFileSync(join(here, '../src/data/unbound/species-table.json'), 'utf8'))
const dex = JSON.parse(readFileSync(join(here, '../src/data/unbound/dex.json'), 'utf8'))

const blank = (): Sectors => {
  const sectors: Sectors = {}
  for (let id = 0; id < 14; id++) sectors[id] = new Uint8Array(SECTOR_DATA)
  return sectors
}
const REG = [[0, 0xf24, 0xff0 - 0xf24], [4, 0xd98, 0xff0 - 0xd98], [13, 0x450, 0xff0 - 0x450]] as const
function put(sectors: Sectors, mem: number, value: number) {
  let offset = mem
  for (const [sector, from, len] of REG) {
    if (offset < len) {
      sectors[sector][from + offset] = value
      return
    }
    offset -= len
  }
  throw new Error('outside extension memory')
}
function setFlag(sectors: Sectors, id: number) {
  const bit = id - 0x900
  let offset = bit >> 3
  for (const [sector, from, len] of REG) {
    if (offset < len) {
      sectors[sector][from + offset] |= 1 << (bit & 7)
      return
    }
    offset -= len
  }
}
function setVar(sectors: Sectors, id: number, value: number) {
  put(sectors, 0x200 + 2 * (id - 0x5000), value & 0xff)
  put(sectors, 0x200 + 2 * (id - 0x5000) + 1, value >> 8)
}

describe('run options from synthetic bytes', () => {
  test('an empty save is off, difficulty 0 is Difficult, and Nuzlocke is null', () => {
    const options = readRunOptions(blank())
    assert.equal(options.randomizer.any.value, false)
    assert.equal(options.scalemons.value, false)
    assert.equal(options.sandbox.value, false)
    assert.deepEqual(
      { raw: options.difficulty.raw, value: options.difficulty.value, confidence: options.difficulty.confidence },
      { raw: 0, value: 'Difficult', confidence: 'likely' },
    )
    assert.equal(options.nuzlocke, null)
  })

  test('each flag flips only its own field', () => {
    const pick: [number, (options: SaveRunOptions) => boolean][] = [
      [FLAG_RANDOMIZER_SPECIES, (options) => options.randomizer.species.value],
      [FLAG_RANDOMIZER_MOVESET, (options) => options.randomizer.moveset.value],
      [FLAG_RANDOMIZER_ABILITY, (options) => options.randomizer.ability.value],
      [FLAG_SCALEMONS, (options) => options.scalemons.value],
      [FLAG_LEVELCAP_START, (options) => options.levelCap.startPrompt.value],
      [FLAG_LEVELCAP_ACTIVE, (options) => options.levelCap.active.value],
      [FLAG_SANDBOX, (options) => options.sandbox.value],
      [FLAG_NGPLUS, (options) => options.newGamePlus.flag.value],
      [FLAG_NGPLUS_AUX, (options) => options.newGamePlus.aux.value],
      [FLAG_CUTSCENES_SKIPPED, (options) => options.cutscenesSkipped.value],
    ]
    for (const [id, get] of pick) {
      const sectors = blank()
      setFlag(sectors, id)
      const options = readRunOptions(sectors)
      assert.equal(get(options), true, id.toString(16))
      const others = pick.filter(([other]) => other !== id).map(([, read]) => read(options))
      assert.equal(others.every((value) => value === false), true, id.toString(16))
    }
  })

  test('randomizer.any is the or of the three parts', () => {
    const sectors = blank()
    setFlag(sectors, FLAG_RANDOMIZER_ABILITY)
    const options = readRunOptions(sectors)
    assert.equal(options.randomizer.any.value, true)
    assert.equal(options.randomizer.species.value, false)
  })

  test('difficulty 0..3 maps to names, and a higher value stays unknown', () => {
    for (let value = 0; value < 4; value += 1) {
      const sectors = blank()
      setVar(sectors, VAR_DIFFICULTY, value)
      assert.equal(readRunOptions(sectors).difficulty.value, DIFFICULTY_NAMES[value])
    }
    const sectors = blank()
    setVar(sectors, VAR_DIFFICULTY, 0x0102)
    const difficulty = readRunOptions(sectors).difficulty
    assert.equal(difficulty.value, 'unknown')
    assert.equal(difficulty.raw, 0x0102)
    const placed = blank()
    setVar(placed, VAR_DIFFICULTY, 2)
    assert.equal(placed[13][0x450 + (0x3be - 0xcc - 0x258)], 2)
  })

  test('confidences match the research table', () => {
    const options = readRunOptions(blank())
    assert.deepEqual(
      [options.randomizer.species.confidence, options.randomizer.moveset.confidence, options.randomizer.ability.confidence, options.scalemons.confidence],
      ['certain', 'certain', 'certain', 'certain'],
    )
    assert.deepEqual(
      [options.difficulty.confidence, options.sandbox.confidence, options.levelCap.startPrompt.confidence],
      ['likely', 'likely', 'likely'],
    )
    assert.deepEqual([options.newGamePlus.flag.confidence, options.levelCap.active.confidence], ['guess', 'guess'])
  })
})

describe('data/run-options.json matches the reader', () => {
  const doc = JSON.parse(readFileSync(join(here, '../src/data/unbound/run-options.json'), 'utf8'))
  const byKey = (key: string) => doc.options.find((entry: { key: string }) => entry.key === key)

  test('ids and confidences match the constants', () => {
    const pairs: [string, number][] = [
      ['randomizer.species', FLAG_RANDOMIZER_SPECIES],
      ['randomizer.moveset', FLAG_RANDOMIZER_MOVESET],
      ['randomizer.ability', FLAG_RANDOMIZER_ABILITY],
      ['scalemons', FLAG_SCALEMONS],
      ['difficulty', VAR_DIFFICULTY],
      ['levelcap.enabled_at_start', FLAG_LEVELCAP_START],
      ['levelcap.active', FLAG_LEVELCAP_ACTIVE],
      ['sandbox', FLAG_SANDBOX],
      ['ngplus.active', FLAG_NGPLUS],
      ['ngplus.aux', FLAG_NGPLUS_AUX],
      ['cutscenes_skipped', FLAG_CUTSCENES_SKIPPED],
    ]
    for (const [key, id] of pairs) {
      assert.equal(parseInt(byKey(key).id, 16), id, key)
      assert.equal(byKey(key).id_dec, id, key)
    }
    const options = readRunOptions(blank())
    assert.equal(byKey('randomizer.species').confidence, options.randomizer.species.confidence)
    assert.equal(byKey('difficulty').confidence, options.difficulty.confidence)
    assert.equal(byKey('ngplus.active').confidence, options.newGamePlus.flag.confidence)
  })

  test('ids sit in the extension ranges, and Nuzlocke is not detectable', () => {
    for (const entry of doc.options) {
      const id = parseInt(entry.id, 16)
      if (entry.type === 'flag') assert.equal(id >= 0x900 && id <= 0x18ff, true, entry.key)
      else assert.equal(id >= 0x5000 && id <= 0x51ff, true, entry.key)
      assert.equal(['certain', 'likely', 'guess', 'unknown'].includes(entry.confidence), true, entry.key)
    }
    assert.equal(doc.not_detectable.some((entry: { key: string; confidence: string }) => entry.key === 'nuzlocke' && entry.confidence === 'unknown'), true)
  })
})

describe('applying a detection never writes NG+ or Nuzlocke', () => {
  test('ticking every row still leaves NG+ and Nuzlocke out of the patch', () => {
    const sectors = blank()
    setFlag(sectors, FLAG_RANDOMIZER_SPECIES)
    setFlag(sectors, FLAG_NGPLUS)
    setFlag(sectors, FLAG_LEVELCAP_START)
    setVar(sectors, VAR_DIFFICULTY, 1)
    const options = readRunOptions(sectors)
    const choices = detectionChoices(options)
    assert.equal(choices.find((choice) => choice.key === 'ngplus.active')?.patch, null)
    assert.equal(choices.find((choice) => choice.key === 'nuzlocke')?.patch, null)
    assert.equal(choices.find((choice) => choice.key === 'nuzlocke')?.confidence, 'unknown')
    const patch = patchFromDetection(options, choices.map((choice) => choice.key))
    assert.equal('ngPlus' in patch, false)
    assert.equal(patch.randomizerSpecies, true)
    assert.equal(patch.difficulty, 'vanilla')
    assert.equal(patch.levelCapOn, true)
    assert.deepEqual(patchFromDetection(options, []), {})
  })
})

describe('starter recognition', () => {
  const mon = (location: number, level = 10, ball: string | null = 'Poké', over: { ownOT?: boolean; isEgg?: boolean; met?: { category?: string } } = {}) => ({
    ownOT: over.ownOT ?? true,
    isEgg: over.isEgg,
    met: { category: over.met?.category ?? 'area', location, level, ballName: ball },
  })

  test('S1: map section 133, catch level 10, Poké Ball, own OT is a likely starter', () => {
    assert.deepEqual(classifyStarter(mon(133)), { isStarter: true, confidence: 'likely', rule: 'S1' })
  })

  test('S2: map section 88 is only a guess', () => {
    assert.deepEqual(classifyStarter(mon(88)), { isStarter: true, confidence: 'guess', rule: 'S2' })
  })

  test('another level, ball, place, trainer, egg, or event is not a starter', () => {
    assert.equal(classifyStarter(mon(133, 65, 'Master')).isStarter, false)
    assert.equal(classifyStarter(mon(133, 10, 'Cherish')).isStarter, false)
    assert.equal(classifyStarter(mon(133, 11)).isStarter, false)
    assert.equal(classifyStarter(mon(101)).isStarter, false)
    assert.equal(classifyStarter(mon(133, 10, 'Poké', { ownOT: false })).isStarter, false)
    assert.equal(classifyStarter(mon(133, 10, 'Poké', { isEgg: true })).isStarter, false)
    assert.equal(classifyStarter(mon(133, 10, 'Poké', { met: { category: 'hatched' } })).isStarter, false)
  })
})

describe('starter classification runs before the route map', () => {
  const routes: RouteOption[] = [
    { name: 'route-1', en: 'Route 1', order: 2, group: 'Opening' },
    { name: 'frozen-heights', en: 'Frozen Heights', order: 1, group: 'Opening' },
    { name: 'cinder-volcano-depths', en: 'Cinder Volcano Depths', order: 38, group: 'Side' },
  ]

  test('a level-10 Poké Ball at map section 133 is a starter, and Patrat on Route 1 is not', () => {
    const sav = buildSave({
      indexA: 8,
      indexB: 1,
      mutate: (sectors) => {
        boxMon(sectors, boxSlot(0, 0), null, 0, 1, 1000, 1010, { location: 133, level: 10, ball: 3 })
        boxMon(sectors, boxSlot(0, 1), null, 0, 557, 800, 2020, { location: 101, level: 8, ball: 3 })
        boxMon(sectors, boxSlot(0, 2), null, 0, 4, 1000, 3030, { location: 88, level: 10, ball: 3 })
        boxMon(sectors, boxSlot(0, 3), null, 0, 6, 100000, 4040, { location: 133, level: 65, ball: 0 })
      },
    })
    const parsed = parseSave(sav, { table, dexNames: dex })
    const plan = planSave(parsed, {
      me: 'fisi',
      catches: [],
      previousNats: [],
      randomizerSpecies: true,
      routes,
      areas: [],
    })
    const bySlot = new Map(plan.mons.map((mon) => [mon.slot, mon]))
    const starter = bySlot.get(0)
    const patrat = bySlot.get(1)
    const legacy = bySlot.get(2)
    const late = bySlot.get(3)
    assert.equal(starter?.starterRule, 'S1')
    assert.equal(starter?.decision, 'starter')
    assert.equal(starter?.place, 'needs-decision')
    assert.equal(starter?.confidence, 'likely')
    assert.equal(starter?.suggestedRoute, null)
    assert.equal(patrat?.nat, 504)
    assert.equal(patrat?.starterRule, null)
    assert.equal(patrat?.place, 'route')
    assert.equal(patrat?.suggestedRoute, 'route-1')
    assert.equal(patrat?.confidence, 'likely')
    assert.equal(legacy?.starterRule, 'S2')
    assert.equal(legacy?.confidence, 'guess')
    assert.equal(legacy?.suggestedRoute, null)
    assert.equal(late?.starterRule, null)
    assert.equal(late?.suggestedRoute, 'cinder-volcano-depths')
    assert.equal(late?.confidence, 'guess')
    const chosen = Object.fromEntries(plan.mons.map((mon) => [mon.id, mon.suggestedRoute ?? '']))
    const ready = confirmAllIds(plan.suggestions, chosen, new Map(plan.mons.map((mon) => [mon.id, { duplicate: false, duplicateOf: null }])))
    assert.deepEqual(ready, [patrat?.id, late?.id])
  })
})

describe('real saves', () => {
  test('new-run options and the Steenee starter', { skip: !existsSync(NEW_SAV) }, async () => {
    const options = readRunOptionsFromSave(new Uint8Array(readFileSync(NEW_SAV)))
    assert.equal(options.randomizer.species.value, true)
    assert.equal(options.randomizer.moveset.value, false)
    assert.equal(options.randomizer.ability.value, false)
    assert.equal(options.scalemons.value, false)
    assert.equal(options.difficulty.raw, 0)
    assert.equal(options.difficulty.value, 'Difficult')
    assert.equal(options.sandbox.value, false)
    assert.equal(options.levelCap.startPrompt.value, true)
    assert.equal(options.levelCap.active.value, false)
    assert.equal(options.newGamePlus.flag.value, true)
    assert.equal(options.newGamePlus.aux.value, true)
    assert.equal(options.cutscenesSkipped.value, true)
    assert.equal(options.nuzlocke, null)
    const parsed = parseSave(new Uint8Array(readFileSync(NEW_SAV)), { table, dexNames: dex })
    assert.equal(parsed.party[0].nickname, 'Roxy')
    assert.deepEqual(classifyStarter({
      ownOT: parsed.party[0].ownOT,
      isEgg: parsed.party[0].isEgg,
      met: {
        category: parsed.party[0].met.category,
        location: parsed.party[0].met.mapSectionId,
        level: parsed.party[0].met.catchLevel,
        ballName: parsed.party[0].met.ballName,
      },
    }), { isStarter: true, confidence: 'likely', rule: 'S1' })
    assert.equal(classifyStarter({
      ownOT: parsed.party[1].ownOT,
      isEgg: parsed.party[1].isEgg,
      met: {
        category: parsed.party[1].met.category,
        location: parsed.party[1].met.mapSectionId,
        level: parsed.party[1].met.catchLevel,
        ballName: parsed.party[1].met.ballName,
      },
    }).isStarter, false)
  })

  test('the older save does not separate NG+', { skip: !existsSync(OLD_SAV) || !existsSync(NEW_SAV) }, () => {
    const older = readRunOptionsFromSave(new Uint8Array(readFileSync(OLD_SAV)))
    const newer = readRunOptionsFromSave(new Uint8Array(readFileSync(NEW_SAV)))
    assert.deepEqual([older.randomizer.species.value, newer.randomizer.species.value], [false, true])
    assert.deepEqual([older.difficulty.value, newer.difficulty.value], ['Vanilla', 'Difficult'])
    assert.deepEqual([older.scalemons.value, newer.scalemons.value], [true, false])
    assert.deepEqual([older.levelCap.startPrompt.value, newer.levelCap.startPrompt.value], [false, true])
    assert.equal(older.newGamePlus.flag.value, true)
  })
})

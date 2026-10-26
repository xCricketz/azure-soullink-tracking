/**
 * Story counters on synthetic saves.
 * A finished real save (act 1 = 42, main = 86) is the end of the story, so it is
 * not used here as a mid-run "you are here" example. That file is not in the repo.
 */
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  EXT_MEM_SIZE,
  STORY_MAIN_DONE_ABOVE,
  VAR_STORY_ACT1,
  VAR_STORY_MAIN,
  assembleExtensionMemory,
  missionStatus,
  readExtFlag,
  readMissions,
  readMissionsFromSave,
  readStoryProgress,
  readVar,
  summarizeMissions,
  type MissionDef,
  type MissionDefs,
} from '../src/lib/save/missions.ts'
import { describeStory } from '../src/lib/save/story-hint.ts'
import { buildSave, type Sectors } from '../src/lib/save/synthetic.ts'
import { SECTOR_DATA, parseSave } from '../src/lib/save/unbound-save.ts'

const here = dirname(fileURLToPath(import.meta.url))
const defs = JSON.parse(readFileSync(join(here, '../src/data/unbound/missions.json'), 'utf8')) as MissionDefs
const table = JSON.parse(readFileSync(join(here, '../src/data/unbound/species-table.json'), 'utf8'))
const dex = JSON.parse(readFileSync(join(here, '../src/data/unbound/dex.json'), 'utf8'))

function blank(): Sectors {
  const sectors: Sectors = {}
  for (let id = 0; id < 14; id++) sectors[id] = new Uint8Array(SECTOR_DATA)
  return sectors
}

function setExtVar(sectors: Sectors, id: number, value: number) {
  const mem = 0x200 + 2 * (id - 0x5000)
  const regions = [
    [0, 0xf24, 0xff0 - 0xf24],
    [4, 0xd98, 0xff0 - 0xd98],
    [13, 0x450, 0xff0 - 0x450],
  ] as const
  for (const byte of [0, 1]) {
    let offset = mem + byte
    const val = (value >> (8 * byte)) & 0xff
    for (const [sector, from, len] of regions) {
      if (offset < len) {
        sectors[sector][from + offset] = val
        break
      }
      offset -= len
    }
  }
}

test('extension memory is 3780 bytes and vars survive a region boundary', () => {
  assert.equal(EXT_MEM_SIZE, 3780)
  assert.equal(assembleExtensionMemory(blank()).length, 3780)
  const sectors = blank()
  for (const id of [0x5000, 0x5001, 0x5091, 0x5092, 0x5093, 0x51ff]) setExtVar(sectors, id, 0x1234 ^ id)
  for (const id of [0x5000, 0x5001, 0x5091, 0x5092, 0x5093, 0x51ff]) {
    assert.equal(readVar(sectors, id), (0x1234 ^ id) & 0xffff)
  }
  assert.equal(sectors[4][0xd98 + 0x258 - 2], (0x1234 ^ 0x5091) & 0xff)
  assert.equal(sectors[13][0x450], (0x1234 ^ 0x5092) & 0xff)
})

test('extended flags and vanilla vars stay in their documented bytes', () => {
  const sectors = blank()
  sectors[0][0xf24] = 0b10
  sectors[0][0xf24 + 1] = 0x80
  assert.equal(readExtFlag(sectors, 0x900), false)
  assert.equal(readExtFlag(sectors, 0x901), true)
  assert.equal(readExtFlag(sectors, 0x90f), true)
  assert.equal(readExtFlag(sectors, 0x8ff), undefined)
  sectors[2][0x10] = 7
  sectors[2][0x13] = 1
  assert.equal(readVar(sectors, 0x4000), 7)
  assert.equal(readVar(sectors, 0x4001), 0x100)
  assert.equal(readVar(sectors, 0x3fff), undefined)
})

test('mission definitions cover 84 missions and the story counters', () => {
  assert.equal(defs.missions.length, 84)
  defs.missions.forEach((mission, index) => {
    assert.equal(mission.id, index)
    assert.ok(mission.name.length > 2)
    assert.ok(mission.var >= 0x5000 && mission.var <= 0x51ff)
  })
  const max = (varId: number) => Math.max(...defs.story_steps.filter((step) => step.var === varId).map((step) => step.value))
  assert.equal(max(VAR_STORY_ACT1), 42)
  assert.equal(max(VAR_STORY_MAIN), 86)
  const byVar = new Map<number, MissionDef[]>()
  for (const mission of defs.missions.slice(1)) byVar.set(mission.var, [...(byVar.get(mission.var) ?? []), mission])
  let shared = 0
  for (const group of byVar.values()) {
    if (group.length < 2) continue
    shared += 1
    const sorted = [...group].sort((a, b) => a.start - b.start)
    for (let i = 1; i < sorted.length; i++) assert.ok(sorted[i].start >= sorted[i - 1].done)
  }
  assert.equal(shared, 6)
})

test('mission status follows the main counter and a short chain', () => {
  const main = defs.missions[0]
  assert.deepEqual(
    [missionStatus(main, 42, 85), missionStatus(main, 42, 86), missionStatus(main, 0, 0)],
    [1, 3, 1],
  )
  assert.ok(STORY_MAIN_DONE_ABOVE === 0x55)
  const simple = defs.missions[1]
  assert.deepEqual([0, 1, 2, 7].map((value) => missionStatus(simple, value, 0)), [0, 1, 3, 3])
  const sectors = blank()
  setExtVar(sectors, 0x5052, 2)
  setExtVar(sectors, 0x5053, 1)
  setExtVar(sectors, VAR_STORY_MAIN, 90)
  const missions = readMissions(sectors, defs.missions)
  const summary = summarizeMissions(missions)
  assert.equal(missions[1].status, 3)
  assert.equal(missions[2].status, 1)
  assert.equal(missions[0].status, 3)
  assert.equal(summary.completed, 2)
  assert.equal(summary.completedExcludingMain, 1)
  assert.equal(summary.total, 84)
})

test('a synthetic mid-story save suggests Distortion World and does not look finished', () => {
  const buf = buildSave({
    indexA: 8,
    indexB: 1,
    mutate: (sectors) => {
      setExtVar(sectors, VAR_STORY_ACT1, 42)
      setExtVar(sectors, VAR_STORY_MAIN, 60)
      setExtVar(sectors, 0x5052, 2)
    },
  })
  const read = readMissionsFromSave(buf, defs)
  assert.equal(read.story.act1, 42)
  assert.equal(read.story.main, 60)
  assert.equal(read.story.finished, false)
  assert.equal(read.story.ordinal, 160)
  assert.equal(read.story.current?.var, VAR_STORY_MAIN)
  assert.equal(read.story.current?.value, 60)
  assert.ok(read.story.current?.locations.includes('Distortion World'))
  assert.notEqual(read.story.next, null)
  const card = describeStory(defs, buf)
  assert.equal(card.hasProgress, true)
  assert.equal(card.confidence, 'guess')
  assert.equal(card.currentLabel, 'Distortion World')
  assert.equal(card.currentKey, 'distortion-world')
  assert.equal(card.finished, false)
  assert.equal(card.completed, 1)
  assert.equal(card.total, 84)
  const empty = readStoryProgress(blank(), defs.story_steps)
  assert.equal(empty.act1, 0)
  assert.equal(empty.main, 0)
  assert.equal(empty.finished, false)
})

test('synthetic fixtures that carry story vars round-trip, and a zero save is not mid-run', () => {
  const dir = join(here, '../save-import/fixtures-synthetic')
  const files = readdirSync(dir).filter((name) => name.endsWith('.sav'))
  assert.ok(files.length >= 30)
  let withStory = 0
  for (const name of files) {
    const buf = new Uint8Array(readFileSync(join(dir, name)))
    let parsed = true
    try {
      parseSave(buf, { table, dexNames: dex })
    } catch {
      parsed = false
    }
    if (!parsed) continue
    const read = readMissionsFromSave(buf, defs)
    const card = describeStory(defs, buf)
    assert.equal(card.total, 84)
    assert.equal(card.confidence, 'guess')
    if (read.story.act1 === 0 && read.story.main === 0) {
      assert.equal(card.hasProgress, false)
      assert.equal(read.story.finished, false)
      continue
    }
    withStory += 1
    assert.equal(card.hasProgress, true)
    assert.equal(card.ordinal, read.story.ordinal)
    if (read.story.main > STORY_MAIN_DONE_ABOVE) {
      assert.equal(read.story.finished, true)
      assert.equal(card.finished, true)
    }
  }
  // The committed fixtures are not a finished playthrough. A real save at the
  // end of the story (0x5011 = 42 and 0x500C = 86) would report finished, and
  // it cannot show a mid-run position.
  assert.equal(withStory, 0)
})

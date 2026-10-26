/**
 * Mission log and story progress from a Pokémon Unbound v2.1.1.1 save.
 * Read-only. Variable layout matches the in-game mission log (vars 0x5000..0x51FF).
 * Locations on story steps are heuristics.
 */
import { SAVE_SIZE, pickActiveSlot, readSlot, SECTOR_DATA } from './unbound-save'

type Sectors = Record<number, Uint8Array>

export const EXT_REGIONS: { sector: number; from: number }[] = [
  { sector: 0, from: 0xf24 },
  { sector: 4, from: 0xd98 },
  { sector: 13, from: 0x450 },
]
export const EXT_MEM_SIZE = EXT_REGIONS.reduce((n, region) => n + (SECTOR_DATA - region.from), 0)
export const EXT_FLAG_FIRST = 0x900
export const EXT_FLAG_LAST = 0x18ff
export const EXT_VAR_FIRST = 0x5000
export const EXT_VAR_LAST = 0x51ff
export const EXT_VARS_OFFSET = 0x200
export const VANILLA_VAR_FIRST = 0x4000
export const VANILLA_VAR_LAST = 0x40ff

/** Main story mission "A Hero's Journey": done when this var is above 0x55. */
export const VAR_STORY_MAIN = 0x500c
export const STORY_MAIN_DONE_ABOVE = 0x55
/** Act 1 counter (0..42 in the scripts). */
export const VAR_STORY_ACT1 = 0x5011

export function assembleExtensionMemory(sectors: Sectors): Uint8Array {
  const out = new Uint8Array(EXT_MEM_SIZE)
  let offset = 0
  for (const region of EXT_REGIONS) {
    const part = sectors[region.sector].subarray(region.from, SECTOR_DATA)
    out.set(part, offset)
    offset += part.length
  }
  return out
}

export function readVar(sectors: Sectors, id: number, ext?: Uint8Array): number | undefined {
  if (id >= EXT_VAR_FIRST && id <= EXT_VAR_LAST) {
    const memory = ext ?? assembleExtensionMemory(sectors)
    const offset = EXT_VARS_OFFSET + 2 * (id - EXT_VAR_FIRST)
    return memory[offset] | (memory[offset + 1] << 8)
  }
  if (id >= VANILLA_VAR_FIRST && id <= VANILLA_VAR_LAST) {
    const offset = 0x10 + 2 * (id - VANILLA_VAR_FIRST)
    return sectors[2][offset] | (sectors[2][offset + 1] << 8)
  }
  return undefined
}

export function readExtFlag(sectors: Sectors, id: number, ext?: Uint8Array): boolean | undefined {
  if (id < EXT_FLAG_FIRST || id > EXT_FLAG_LAST) return undefined
  const memory = ext ?? assembleExtensionMemory(sectors)
  const bit = id - EXT_FLAG_FIRST
  return ((memory[bit >> 3] >> (bit & 7)) & 1) === 1
}

export interface MissionDef {
  id: number
  name: string
  var: number
  start: number
  turnin: number
  done: number
  category_byte: number
  stage_count: number | null
  stage_mapsecs: number[] | null
  stage_locations: (string | null)[] | null
}

export interface StoryStepDef {
  var: number
  value: number
  setvar_sites: number
  locations: (string | null)[]
  mapsecs: number[]
}

export interface MissionDefs {
  missions: MissionDef[]
  story_steps: StoryStepDef[]
}

/** 0 not started, 1 active, 2 ready to turn in, 3 completed. */
export type MissionStatus = 0 | 1 | 2 | 3

export function missionStatus(def: MissionDef, value: number, storyMain: number): MissionStatus {
  if (def.id === 0) return storyMain > STORY_MAIN_DONE_ABOVE ? 3 : 1
  if (value >= def.done) return 3
  if (value < def.start) return 0
  if (def.turnin !== 0 && value === def.turnin) return 2
  return 1
}

export interface MissionState {
  id: number
  name: string
  var: number
  value: number
  status: MissionStatus
  stage?: number
  stages?: number | null
  location?: string | null
}

export function readMissions(sectors: Sectors, defs: MissionDef[]): MissionState[] {
  const ext = assembleExtensionMemory(sectors)
  const main = readVar(sectors, VAR_STORY_MAIN, ext) ?? 0
  return defs.map((def) => {
    const value = readVar(sectors, def.var, ext) ?? 0
    const status = missionStatus(def, value, main)
    const state: MissionState = { id: def.id, name: def.name, var: def.var, value, status }
    if (status === 1 || status === 2) {
      state.stage = value - def.start + 1
      state.stages = def.stage_count
      state.location = def.stage_locations?.[value - def.start] ?? null
    }
    return state
  })
}

export interface MissionSummary {
  total: number
  completed: number
  active: number
  turnin: number
  notStarted: number
  completedExcludingMain: number
}

export function summarizeMissions(missions: MissionState[]): MissionSummary {
  const count = (status: MissionStatus) => missions.filter((mission) => mission.status === status).length
  const done = count(3)
  return {
    total: missions.length,
    completed: done,
    active: count(1),
    turnin: count(2),
    notStarted: count(0),
    completedExcludingMain: done - (missions[0]?.status === 3 ? 1 : 0),
  }
}

export interface StoryProgress {
  act1: number
  main: number
  finished: boolean
  /** Act 1 uses 0..42. After that the position is 100 plus the main counter (0x500C ≥ 2). */
  ordinal: number
  current: StoryStepDef | null
  next: StoryStepDef | null
}

function ordinalOf(varId: number, value: number): number {
  return varId === VAR_STORY_ACT1 ? value : 100 + value
}

export function readStoryProgress(sectors: Sectors, steps: StoryStepDef[] = []): StoryProgress {
  const ext = assembleExtensionMemory(sectors)
  const act1 = readVar(sectors, VAR_STORY_ACT1, ext) ?? 0
  const main = readVar(sectors, VAR_STORY_MAIN, ext) ?? 0
  const ordinal = main >= 2 ? ordinalOf(VAR_STORY_MAIN, main) : ordinalOf(VAR_STORY_ACT1, act1)
  const sorted = [...steps]
    .filter((step) => step.var === VAR_STORY_ACT1 || step.value >= 2)
    .sort((a, b) => ordinalOf(a.var, a.value) - ordinalOf(b.var, b.value))
  let current: StoryStepDef | null = null
  let next: StoryStepDef | null = null
  for (const step of sorted) {
    if (ordinalOf(step.var, step.value) <= ordinal) current = step
    else {
      next = step
      break
    }
  }
  return { act1, main, finished: main > STORY_MAIN_DONE_ABOVE, ordinal, current, next }
}

export function activeSectors(buf: Uint8Array): Sectors {
  const body = buf.length === SAVE_SIZE + 16 ? buf.subarray(16) : buf
  const slot = pickActiveSlot(readSlot(body, 0), readSlot(body, 1))
  if (!slot.valid) throw new Error('no valid save slot')
  return slot.sectors
}

export function readMissionsFromSave(buf: Uint8Array, defs: MissionDefs) {
  const sectors = activeSectors(buf)
  const missions = readMissions(sectors, defs.missions)
  return { missions, summary: summarizeMissions(missions), story: readStoryProgress(sectors, defs.story_steps) }
}

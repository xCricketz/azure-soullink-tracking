/**
 * Run options and starter recognition for Pokémon Unbound v2.1.1.1.
 * Flag and variable ids are from the v6 research bundle (SPEC §14). Read-only.
 * Nuzlocke is not a game option, so it is never read and never written from a save.
 */
import type { Difficulty, RunOptions as TrackerOptions } from '../types'
import { activeSectors, assembleExtensionMemory, readExtFlag, readVar } from './missions'

type Sectors = Record<number, Uint8Array>

export type Confidence = 'certain' | 'likely' | 'guess' | 'unknown'

export const FLAG_RANDOMIZER_SPECIES = 0x09fd
export const FLAG_RANDOMIZER_MOVESET = 0x09fe
export const FLAG_RANDOMIZER_ABILITY = 0x1522
export const FLAG_SCALEMONS = 0x16e2
export const VAR_DIFFICULTY = 0x50df
export const FLAG_LEVELCAP_START = 0x16e0
export const FLAG_LEVELCAP_ACTIVE = 0x16ec
export const FLAG_SANDBOX = 0x16e4
export const FLAG_NGPLUS = 0x16db
export const FLAG_NGPLUS_AUX = 0x16dc
export const FLAG_CUTSCENES_SKIPPED = 0x16e3

/** Var 0x50DF. 0 is the game's default, Difficult. Values above 3 were not observed. */
export const DIFFICULTY_NAMES = ['Difficult', 'Vanilla', 'Expert', 'Insane'] as const
export type SaveDifficulty = (typeof DIFFICULTY_NAMES)[number] | 'unknown'

export interface Entry<T> { value: T; confidence: Confidence; id: string }

export interface SaveRunOptions {
  randomizer: {
    species: Entry<boolean>
    moveset: Entry<boolean>
    ability: Entry<boolean>
    any: Entry<boolean>
  }
  scalemons: Entry<boolean>
  difficulty: Entry<SaveDifficulty> & { raw: number }
  levelCap: { startPrompt: Entry<boolean>; active: Entry<boolean> }
  sandbox: Entry<boolean>
  /** Not distinctive. Shown as a guess. Never applied on its own. */
  newGamePlus: { flag: Entry<boolean>; aux: Entry<boolean> }
  cutscenesSkipped: Entry<boolean>
  nuzlocke: null
}

const hex = (n: number) => '0x' + n.toString(16).toUpperCase().padStart(4, '0')

function fl(sectors: Sectors, ext: Uint8Array, id: number, confidence: Confidence): Entry<boolean> {
  return { value: readExtFlag(sectors, id, ext) === true, confidence, id: hex(id) }
}

export function readRunOptions(sectors: Sectors): SaveRunOptions {
  const ext = assembleExtensionMemory(sectors)
  const species = fl(sectors, ext, FLAG_RANDOMIZER_SPECIES, 'certain')
  const moveset = fl(sectors, ext, FLAG_RANDOMIZER_MOVESET, 'certain')
  const ability = fl(sectors, ext, FLAG_RANDOMIZER_ABILITY, 'certain')
  const raw = readVar(sectors, VAR_DIFFICULTY, ext) ?? 0
  return {
    randomizer: {
      species, moveset, ability,
      any: {
        value: species.value || moveset.value || ability.value,
        confidence: 'certain',
        id: [species, moveset, ability].map((entry) => entry.id).join('|'),
      },
    },
    scalemons: fl(sectors, ext, FLAG_SCALEMONS, 'certain'),
    difficulty: {
      value: raw < DIFFICULTY_NAMES.length ? DIFFICULTY_NAMES[raw] : 'unknown',
      raw,
      confidence: 'likely',
      id: hex(VAR_DIFFICULTY),
    },
    levelCap: {
      startPrompt: fl(sectors, ext, FLAG_LEVELCAP_START, 'likely'),
      active: fl(sectors, ext, FLAG_LEVELCAP_ACTIVE, 'guess'),
    },
    sandbox: fl(sectors, ext, FLAG_SANDBOX, 'likely'),
    newGamePlus: {
      flag: fl(sectors, ext, FLAG_NGPLUS, 'guess'),
      aux: fl(sectors, ext, FLAG_NGPLUS_AUX, 'guess'),
    },
    cutscenesSkipped: fl(sectors, ext, FLAG_CUTSCENES_SKIPPED, 'likely'),
    nuzlocke: null,
  }
}

export function readRunOptionsFromSave(buf: Uint8Array): SaveRunOptions {
  return readRunOptions(activeSectors(buf))
}

export const MAPSEC_STARTER_ROOM = 133
export const MAPSEC_STARTER_LEGACY = 88
const BALL_POKE = 'Poké'

export interface StarterVerdict { isStarter: boolean; confidence: Confidence | null; rule: 'S1' | 'S2' | null }

export interface StarterCandidate {
  ownOT: boolean
  isEgg?: boolean
  met: { category: string; location: number; level: number; ballName: string | null }
}

export function classifyStarter(mon: StarterCandidate): StarterVerdict {
  const no: StarterVerdict = { isStarter: false, confidence: null, rule: null }
  if (!mon.ownOT || mon.isEgg || mon.met.category !== 'area' || mon.met.level !== 10 || mon.met.ballName !== BALL_POKE) return no
  if (mon.met.location === MAPSEC_STARTER_ROOM) return { isStarter: true, confidence: 'likely', rule: 'S1' }
  if (mon.met.location === MAPSEC_STARTER_LEGACY) return { isStarter: true, confidence: 'guess', rule: 'S2' }
  return no
}

const TRACKER_DIFFICULTY: Record<Exclude<SaveDifficulty, 'unknown'>, Difficulty> = {
  Difficult: 'difficult',
  Vanilla: 'vanilla',
  Expert: 'expert',
  Insane: 'insane',
}

export interface DetectionChoice {
  key: string
  label: string
  value: string
  confidence: Confidence
  note: string
  /** Null when this row must not change the tracker. NG+ and Nuzlocke stay null. */
  patch: Partial<TrackerOptions> | null
}

export function detectionChoices(options: SaveRunOptions): DetectionChoice[] {
  const onOff = (value: boolean) => (value ? 'On' : 'Off')
  const difficultyPatch = options.difficulty.value === 'unknown' ? null : { difficulty: TRACKER_DIFFICULTY[options.difficulty.value] }
  return [
    { key: 'randomizer.species', label: 'Species randomizer', value: onOff(options.randomizer.species.value), confidence: options.randomizer.species.confidence, note: options.randomizer.species.id, patch: { randomizerSpecies: options.randomizer.species.value } },
    { key: 'randomizer.moveset', label: 'Move randomizer', value: onOff(options.randomizer.moveset.value), confidence: options.randomizer.moveset.confidence, note: options.randomizer.moveset.id, patch: { randomizerMoves: options.randomizer.moveset.value } },
    { key: 'randomizer.ability', label: 'Ability randomizer', value: onOff(options.randomizer.ability.value), confidence: options.randomizer.ability.confidence, note: options.randomizer.ability.id, patch: { randomizerAbilities: options.randomizer.ability.value } },
    { key: 'scalemons', label: 'Scalemons', value: onOff(options.scalemons.value), confidence: options.scalemons.confidence, note: `${options.scalemons.id}. Shown from the save. This tracker does not use it.`, patch: null },
    { key: 'difficulty', label: 'Difficulty', value: options.difficulty.value === 'unknown' ? `Unknown (${options.difficulty.raw})` : options.difficulty.value, confidence: options.difficulty.confidence, note: options.difficulty.id, patch: difficultyPatch },
    { key: 'levelcap.enabled_at_start', label: 'Level cap', value: onOff(options.levelCap.startPrompt.value), confidence: options.levelCap.startPrompt.confidence, note: `${options.levelCap.startPrompt.id}. Asked at the start on Difficult.`, patch: { levelCapOn: options.levelCap.startPrompt.value } },
    { key: 'levelcap.active', label: 'Level cap active', value: onOff(options.levelCap.active.value), confidence: options.levelCap.active.confidence, note: `${options.levelCap.active.id}. Not used to change the tracker.`, patch: null },
    { key: 'sandbox', label: 'Sandbox', value: onOff(options.sandbox.value), confidence: options.sandbox.confidence, note: options.sandbox.id, patch: { sandbox: options.sandbox.value } },
    { key: 'ngplus.active', label: 'New Game Plus', value: onOff(options.newGamePlus.flag.value), confidence: options.newGamePlus.flag.confidence, note: `${options.newGamePlus.flag.id}. Also set on an older save, so it is not applied.`, patch: null },
    { key: 'cutscenes_skipped', label: 'Opening cutscenes skipped', value: onOff(options.cutscenesSkipped.value), confidence: options.cutscenesSkipped.confidence, note: `${options.cutscenesSkipped.id}. Shown from the save. This tracker does not use it.`, patch: null },
    { key: 'nuzlocke', label: 'Nuzlocke', value: 'Not in the save', confidence: 'unknown', note: 'Not a game option. The tracker rule stays as it is.', patch: null },
  ]
}

/** The keys the user ticked. Rows without a patch, including NG+ and Nuzlocke, are ignored. */
export function patchFromDetection(options: SaveRunOptions, selected: readonly string[]): Partial<TrackerOptions> {
  const want = new Set(selected)
  const patch: Partial<TrackerOptions> = {}
  for (const choice of detectionChoices(options)) {
    if (!choice.patch || !want.has(choice.key)) continue
    Object.assign(patch, choice.patch)
  }
  return patch
}
